import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    RefreshControl,
    StatusBar as RNStatusBar,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AuroraWaves } from '../components/common/AuroraWaves';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING, getThemedColors } from '../constants/theme';
import { authAPI, Device, deviceAPI, DeviceCurrentStatus } from '../services/api';
import { NetworkService } from '../utils/network-utils';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceCurrentStatus>>(
    new Map()
  );
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsPage, setAlertsPage] = useState(1);
  const [loadingMoreAlerts, setLoadingMoreAlerts] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = React.useRef(false);

  const loadData = async () => {
    if (isUnmountingRef.current) return; // Don't start new requests if logging out
    
    // Check network first
    const online = await NetworkService.checkConnection();
    setIsOnline(online);
    
    if (!online) {
      // Try to load cached data
      try {
        const cachedDevices = await AsyncStorage.getItem('@cached_devices');
        const cachedUser = await AsyncStorage.getItem('@cached_user');
        const cachedAlerts = await AsyncStorage.getItem('@cached_alerts');
        
        if (cachedDevices) setDevices(JSON.parse(cachedDevices));
        if (cachedUser) setUser(JSON.parse(cachedUser));
        if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
        
        setLoading(false);
        setAuthChecked(true);
        setHasError(true);
        setErrorMessage('You are currently offline. Showing cached data.');
      } catch (e) {
        setLoading(false);
        setAuthChecked(true);
        setHasError(true);
        setErrorMessage('You are currently offline and no cached data available.');
      }
      return;
    }
    
    setHasError(false);
    setErrorMessage('');
    
    try {
      const [userData, devicesData] = await Promise.all([
        authAPI.getCurrentUser(),
        deviceAPI.getMyDevices(),
      ]);

      if (isUnmountingRef.current) return; // Don't update state if logged out
      
      setUser(userData);
      setDevices(devicesData);

      // Load status for each device
      const statusPromises = devicesData.map((device) =>
        deviceAPI.getDeviceCurrentStatus(device.id).catch(() => null)
      );
      
      // Load alerts from all devices
      const alertsPromises = devicesData.map((device) =>
        deviceAPI.getDeviceAlerts(device.id).catch(() => [])
      );
      const statuses = await Promise.all(statusPromises);

      const statusMap = new Map();
      statuses.forEach((status, index) => {
        if (status) {
          statusMap.set(devicesData[index].id, status);
        }
      });
      
      if (isUnmountingRef.current) return; // Don't update state if logged out
      setDeviceStatuses(statusMap);
    } catch (error: any) {
      if (isUnmountingRef.current) return; // Ignore errors if logging out
      // Only log non-auth errors
      if (error.response?.status !== 401) {
        console.error('Failed to load data:', error);
      }
      
      // If 401, redirect to login (storage already cleared by interceptor)
      if (error.response?.status === 401 || error.isAuthError) {
        console.log('🔐 Session expired, redirecting to login...');
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribe = NetworkService.subscribe((online) => {
      setIsOnline(online);
      if (online && hasError) {
        // Reconnected, try loading again
        loadData();
      }
    });
    
    // Check auth first
    const checkAuthAndLoad = async () => {
      const isAuth = await authAPI.isAuthenticated();
      if (!isAuth) {
        console.log('Not authenticated, redirecting to login');
        router.replace('/');
        return;
      }
      setAuthChecked(true);
      loadData();
    };
    
    checkAuthAndLoad();
    
    // Auto refresh every 10 seconds (only if online)
    intervalRef.current = setInterval(() => {
      if (authChecked && isOnline) {
        loadData();
      }
    }, 10000);
    
    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authChecked, isOnline, hasError]);

  const onlineDevices = devices.filter((d) => deviceStatuses.get(d.id)?.online);
  const offlineDevices = devices.filter((d) => !deviceStatuses.get(d.id)?.online);

  const handleAddDevice = async () => {
    if (!newDeviceId.trim() || !newDeviceName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setAddingDevice(true);
    try {
      await deviceAPI.registerDevice(newDeviceId.trim(), newDeviceName.trim());
      setShowAddModal(false);
      setNewDeviceId('');
      setNewDeviceName('');
      await loadData();
      Alert.alert('Success', 'Device added successfully! 🎉');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add device');
    } finally {
      setAddingDevice(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;

    setDeleting(true);
    try {
      await deviceAPI.removeDevice(deviceToDelete.id);
      setShowDeleteModal(false);
      setDeviceToDelete(null);
      await loadData();
      Alert.alert('Success', 'Device removed from your account');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to remove device');
    } finally {
      setDeleting(false);
    }
  };

  const loadMoreAlerts = () => {
    setAlertsPage(prev => prev + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = async () => {
    console.log('🚪 Logout clicked - clearing local session');
    
    // Prevent any further async work and stop polling
    isUnmountingRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Ensure we actually remove the keys used by authAPI
    try {
      await AsyncStorage.multiRemove([
        '@iotux_auth_token',
        '@iotux_user_data',
        '@cached_devices',
        '@cached_user',
        '@cached_alerts',
      ]);
    } catch {}
    
    // Redirect to login
    setTimeout(() => {
      router.replace('/login');
    }, 0);
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* 1. The Liquid Background Layer - only in dark mode */}
      {isDark && (
        <View style={StyleSheet.absoluteFill}>
          <AuroraWaves />
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={COLORS.white} 
            />
          }
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={[styles.greeting, { color: themedColors.textSecondary }]}>Welcome back,</Text>
              <Text style={[styles.userName, { color: themedColors.text }]}>{user?.name || 'Pilot'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleLogout}
            >
              <BlurView intensity={50} tint="light" style={styles.avatarBlur}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Overview Stats - Floating Glass Cards */}
          <Text style={[styles.sectionTitle, { color: themedColors.text }]}>System Status</Text>
          <View style={styles.statsRow}>
            <Card style={styles.statCard} variant="featured">
              <Text style={[styles.statNumber, { color: themedColors.text }]}>{devices.length}</Text>
              <Text style={[styles.statLabel, { color: themedColors.textSecondary }]}>Total</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {onlineDevices.length}
              </Text>
              <Text style={[styles.statLabel, { color: themedColors.textSecondary }]}>Online</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statNumber, { color: COLORS.danger }]}>
                {offlineDevices.length}
              </Text>
              <Text style={[styles.statLabel, { color: themedColors.textSecondary }]}>Offline</Text>
            </Card>
          </View>

          {/* Device List */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themedColors.text }]}>Active Devices</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={styles.actionText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {devices.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: themedColors.text }]}>No vehicles tracked</Text>
              <Text style={[styles.emptySubtext, { color: themedColors.textSecondary }]}>Add a device to start monitoring</Text>
            </Card>
          ) : (
            devices.map((device) => {
              const status = deviceStatuses.get(device.id);
              return (
                <TouchableOpacity
                  key={device.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/device-detail?deviceId=${device.id}`)}
                >
                  <Card style={styles.deviceRow}>
                    <View style={styles.iconContainer}>
                      <Text style={{ fontSize: 24 }}>🛵</Text>
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, { color: themedColors.text }]}>{device.name}</Text>
                      <Text style={[styles.deviceId, { color: themedColors.textTertiary }]}>{device.id}</Text>
                    </View>
                    <StatusBadge status={status?.online ? 'online' : 'offline'} size="small" /> 
                    <Text style={[styles.chevron, { color: themedColors.textTertiary }]}>›</Text>
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: isDark ? 'rgba(20,20,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
          }]}>
            <Text style={[styles.modalTitle, { color: themedColors.text }]}>Add New Device</Text>
            <Text style={[styles.modalSubtitle, { color: themedColors.textSecondary }]}>
              Enter your device ID and a friendly name
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themedColors.text }]}>Device ID</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                  color: themedColors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }]}
                placeholder="e.g., MOTOR-ABC123"
                placeholderTextColor={themedColors.textTertiary}
                value={newDeviceId}
                onChangeText={setNewDeviceId}
                autoCapitalize="characters"
                editable={!addingDevice}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themedColors.text }]}>Device Name</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                  color: themedColors.text,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }]}
                placeholder="e.g., My Honda Beat"
                placeholderTextColor={themedColors.textTertiary}
                value={newDeviceName}
                onChangeText={setNewDeviceName}
                editable={!addingDevice}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                }]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewDeviceId('');
                  setNewDeviceName('');
                }}
                disabled={addingDevice}
              >
                <Text style={[styles.cancelButtonText, { color: themedColors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddDevice}
                disabled={addingDevice}
              >
                {addingDevice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add Device</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Device Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: isDark ? 'rgba(20,20,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
          }]}>
            <Text style={[styles.modalTitle, { color: themedColors.text }]}>Delete Device?</Text>
            <Text style={[styles.modalSubtitle, { color: themedColors.textSecondary }]}>
              Select a device to remove from your account
            </Text>

            <View style={styles.deviceSelector}>
              {devices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceSelectorItem,
                    {
                      borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    },
                    deviceToDelete?.id === device.id && styles.deviceSelectorItemActive,
                  ]}
                  onPress={() => setDeviceToDelete(device)}
                >
                  <Text style={[
                    styles.deviceSelectorText,
                    { color: themedColors.text },
                    deviceToDelete?.id === device.id && styles.deviceSelectorTextActive,
                  ]}>
                    {device.name}
                  </Text>
                  <Text style={[styles.deviceSelectorId, { color: themedColors.textTertiary }]}>{device.id}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderColor: isDark ? COLORS.glassBorder : COLORS.glassBorderLight,
                }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeviceToDelete(null);
                }}
                disabled={deleting}
              >
                <Text style={[styles.cancelButtonText, { color: themedColors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteDevice}
                disabled={deleting || !deviceToDelete}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Fallback if aurora fails
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  date: {
    color: COLORS.secondary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  greeting: {
    color: COLORS.gray400,
    fontSize: FONT_SIZES.lg,
  },
  userName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  actionText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  statNumber: {
    color: COLORS.white,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  statLabel: {
    color: COLORS.gray400,
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  deviceId: {
    color: COLORS.gray500,
    fontSize: FONT_SIZES.xs,
  },
  chevron: {
    color: COLORS.gray500,
    fontSize: 24,
    marginLeft: SPACING.md,
    fontWeight: '300',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.gray200,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.gray500,
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Will be overridden inline
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: 'rgba(20,20,30,0.95)', // Will be overridden inline
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.glassBorder, // Will be overridden inline
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white, // Will be overridden inline
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400, // Will be overridden inline
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray200, // Will be overridden inline
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.glassBorder, // Will be overridden inline
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white, // Will be overridden inline
    backgroundColor: 'rgba(255,255,255,0.05)', // Will be overridden inline
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)', // Will be overridden inline
    borderWidth: 1,
    borderColor: COLORS.glassBorder, // Will be overridden inline
  },
  cancelButtonText: {
    color: COLORS.white, // Will be overridden inline
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  deviceSelector: {
    maxHeight: 300,
    marginBottom: SPACING.md,
  },
  deviceSelectorItem: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder, // Will be overridden inline
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)', // Will be overridden inline
  },
  deviceSelectorItemActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  deviceSelectorText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.xs / 2,
  },
  deviceSelectorTextActive: {
    color: COLORS.primary,
  },
  deviceSelectorId: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
});
