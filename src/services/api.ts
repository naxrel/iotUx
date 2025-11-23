import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../constants/theme';

const AUTH_TOKEN_KEY = '@iotux_auth_token';
const USER_DATA_KEY = '@iotux_user_data';

// In-memory cache for auth token to avoid AsyncStorage reads on every request
let cachedAuthToken: string | null = null;
let tokenCachePromise: Promise<string | null> | null = null;

// Initialize token cache (singleton pattern to prevent race conditions)
const initializeTokenCache = async (): Promise<string | null> => {
  // If already initialized, return cached value
  if (cachedAuthToken !== null) {
    return cachedAuthToken;
  }
  
  // If initialization is in progress, wait for it
  if (tokenCachePromise) {
    return tokenCachePromise;
  }
  
  // Start initialization
  tokenCachePromise = AsyncStorage.getItem(AUTH_TOKEN_KEY)
    .then(token => {
      cachedAuthToken = token;
      return token;
    })
    .catch(err => {
      console.warn('Failed to initialize token cache:', err);
      tokenCachePromise = null;
      return null;
    });
  
  return tokenCachePromise;
};

// Call this to update the cached token
const updateCachedToken = (token: string | null) => {
  cachedAuthToken = token;
  tokenCachePromise = null;
};

// Start initialization on module load (won't block API calls)
initializeTokenCache();

// Request deduplication cache
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const REQUEST_CACHE_TTL = 1000; // Cache for 1 second

// Helper to create cache key from request config
const getCacheKey = (url: string, method: string = 'GET'): string => {
  return `${method}:${url}`;
};

// Cleanup stale cache entries
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of pendingRequests.entries()) {
    if (now - value.timestamp > REQUEST_CACHE_TTL) {
      pendingRequests.delete(key);
    }
  }
};

// Run cleanup on-demand when adding new requests to avoid memory leaks
// without needing a timer that runs indefinitely
const cleanupAndCache = (key: string, promise: Promise<any>) => {
  // Cleanup old entries before adding new one
  cleanupCache();
  
  pendingRequests.set(key, { promise, timestamp: Date.now() });
  
  // Remove from cache after completion (not after TTL to avoid race conditions)
  promise.finally(() => {
    pendingRequests.delete(key);
  });
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Use cached token if available, otherwise load from storage
    const token = cachedAuthToken ?? await initializeTokenCache();
    if (token) {
      config.headers['X-Auth-Token'] = token;
      console.log('Request with token:', {
        url: config.url,
        method: config.method,
        hasToken: true,
      });
    } else {
      console.log('Request without token:', {
        url: config.url,
        method: config.method,
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    
    // Log detailed error (but not 401 as that's expected when not logged in)
    if (status !== 401) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: status,
        data: error.response?.data,
        message: error.message,
      });
    }
    
    if (status === 401) {
      // Clear auth data on 401 - this is expected, user needs to login again
      console.log('🔐 Session expired - please login again');
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
      updateCachedToken(null); // Clear cached token
      
      // Flag this error as handled so we don't show red screen
      error.isAuthError = true;
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface User {
  user_id: number;
  name: string;
  email: string;
  auth_token: string;
}

export interface Device {
  id: string;
  name: string;
  user_id: number | null;
}

export interface DeviceStatus {
  device_id: string;
  online: boolean;
  seconds_since_seen: number;
  last_seen: string | null;
}

export interface DeviceCurrentStatus extends DeviceStatus {
  name: string; // Added name here
  last_status: string | null;
  armed_state: string | null; // "armed" or "disarmed"
  lat: number | null;
  lon: number | null;
}

export interface Alert {
  id: number;
  device_id: string;
  status: string;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

// Auth API
export const authAPI = {
  register: async (name: string, email: string, password: string): Promise<User> => {
    const response = await api.post<User>('/register', { name, email, password });
    const userData = response.data;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, userData.auth_token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    updateCachedToken(userData.auth_token); // Update cache
    return userData;
  },

  login: async (email: string, password: string): Promise<User> => {
    const response = await api.post<User>('/login', { email, password });
    const userData = response.data;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, userData.auth_token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    updateCachedToken(userData.auth_token); // Update cache
    return userData;
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
    updateCachedToken(null); // Clear cache
  },

  getCurrentUser: async (): Promise<User | null> => {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      return false;
    }
    
    // Just check if token exists - validation will happen on first API call
    // This prevents unnecessary API calls on app launch
    return true;
  },
};

// Device API
export const deviceAPI = {
  getMyDevices: async (): Promise<Device[]> => {
    const cacheKey = getCacheKey('/me/devices', 'GET');
    const pending = pendingRequests.get(cacheKey);
    
    // Return existing promise if request is already in flight
    if (pending && Date.now() - pending.timestamp < REQUEST_CACHE_TTL) {
      console.log('🔄 Deduplicating getMyDevices request');
      return pending.promise;
    }
    
    const promise = api.get<Device[]>('/me/devices').then(res => res.data);
    cleanupAndCache(cacheKey, promise);
    return promise;
  },

  registerDevice: async (deviceId: string, name: string): Promise<Device> => {
    const response = await api.post<Device>('/devices/register', {
      device_id: deviceId,
      name,
    });
    return response.data;
  },

  removeDevice: async (deviceId: string): Promise<Device> => {
    const response = await api.delete<Device>(`/devices/${deviceId}`);
    return response.data;
  },

  getDeviceStatus: async (deviceId: string): Promise<DeviceStatus> => {
    const cacheKey = getCacheKey(`/devices/${deviceId}/status`, 'GET');
    const pending = pendingRequests.get(cacheKey);
    
    if (pending && Date.now() - pending.timestamp < REQUEST_CACHE_TTL) {
      console.log(`🔄 Deduplicating getDeviceStatus request for ${deviceId}`);
      return pending.promise;
    }
    
    const promise = api.get<DeviceStatus>(`/devices/${deviceId}/status`).then(res => res.data);
    cleanupAndCache(cacheKey, promise);
    return promise;
  },

  getDeviceCurrentStatus: async (deviceId: string): Promise<DeviceCurrentStatus> => {
    const cacheKey = getCacheKey(`/devices/${deviceId}/current`, 'GET');
    const pending = pendingRequests.get(cacheKey);
    
    if (pending && Date.now() - pending.timestamp < REQUEST_CACHE_TTL) {
      console.log(`🔄 Deduplicating getDeviceCurrentStatus request for ${deviceId}`);
      return pending.promise;
    }
    
    const promise = api.get<DeviceCurrentStatus>(`/devices/${deviceId}/current`).then(res => res.data);
    cleanupAndCache(cacheKey, promise);
    return promise;
  },

  getDeviceAlerts: async (deviceId: string): Promise<Alert[]> => {
    const cacheKey = getCacheKey(`/api/devices/${deviceId}/alerts`, 'GET');
    const pending = pendingRequests.get(cacheKey);
    
    if (pending && Date.now() - pending.timestamp < REQUEST_CACHE_TTL) {
      console.log(`🔄 Deduplicating getDeviceAlerts request for ${deviceId}`);
      return pending.promise;
    }
    
    const promise = api.get<Alert[]>(`/api/devices/${deviceId}/alerts`).then(res => res.data);
    cleanupAndCache(cacheKey, promise);
    return promise;
  },

  toggleArmedState: async (deviceId: string): Promise<{ device_id: string; armed_state: string }> => {
    const response = await api.post<{ device_id: string; armed_state: string }>(`/devices/${deviceId}/toggle`);
    return response.data;
  },

  sendCommand: async (deviceId: string, command: string, value?: string): Promise<any> => {
    const response = await api.post(`/api/send/${deviceId}`, { command, value });
    return response.data;
  },
};

export default api;
