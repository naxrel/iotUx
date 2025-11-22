import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { CircleToggle } from '../components/common/CircleToggle';
import { MapComponent } from '../components/common/MapComponent';
import { StatusBadge } from '../components/common/StatusBadge';
import { BORDER_RADIUS, COLORS, FONT_SIZES, SPACING, getThemedColors } from '../constants/theme';
import { Alert as DeviceAlert, deviceAPI, DeviceCurrentStatus } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';const { width } = Dimensions.get('window');

interface LastValidLocation {
  lat: number;
  lon: number;
  timestamp: Date;
}

export default function DeviceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);
  // Safely get deviceId, handle array case
  const deviceId = Array.isArray(params.deviceId) ? params.deviceId[0] : params.deviceId;

  const [deviceStatus, setDeviceStatus] = useState<DeviceCurrentStatus | null>(null);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [alertsPage, setAlertsPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [lastValidLocation, setLastValidLocation] = useState<LastValidLocation | null>(null);
  const isTogglingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!deviceId) {
      setError('Device ID is missing.');
      setLoading(false);
      return;
    }

    try {
      const [statusData, alertsData] = await Promise.all([
        deviceAPI.getDeviceCurrentStatus(deviceId),
        deviceAPI.getDeviceAlerts(deviceId),
      ]);

      // Ensure data is valid before setting state
      // Skip update if we're in the middle of toggling (keep optimistic update)
      if (statusData && !isTogglingRef.current) {
        setDeviceStatus(statusData);
        
        // Update last valid location if we have valid coordinates
        if (statusData.lat != null && statusData.lon != null && 
            !(statusData.lat === 0 && statusData.lon === 0)) {
          setLastValidLocation({
            lat: statusData.lat,
            lon: statusData.lon,
            timestamp: new Date(),
          });
        }
      }
      if (Array.isArray(alertsData)) {
        setAlerts([...alertsData].reverse()); // Show newest first safely
      }
      
      setAlertsPage(1);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load device data:', err);
      if (err.response?.status === 401) {
        router.replace('/login');
      } else {
        setError('Failed to load device data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceId, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    setLoading(true);
    loadData();

    // Auto refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const sendCommand = async (command: string) => {
    if (!deviceId) return;
    setSending(command);
    try {
      await deviceAPI.sendCommand(deviceId, command);
      Alert.alert('Success', `Command "${command}" sent successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send command');
    } finally {
      setSending(null);
    }
  };

  const handleArmToggle = async (shouldArm: boolean) => {
    if (!deviceId) return;
    const command = shouldArm ? 'ARM' : 'DISARM';
    setSending('toggle');
    isTogglingRef.current = true;
    
    // Optimistic update - update UI immediately
    if (deviceStatus) {
      setDeviceStatus({
        ...deviceStatus,
        armed_state: shouldArm ? 'armed' : 'disarmed',
      });
    }
    
    try {
      // Send the ARM/DISARM command using the existing endpoint
      await deviceAPI.sendCommand(deviceId, command);
      Alert.alert('Success', `Device ${shouldArm ? 'ARMED' : 'DISARMED'}`);
      // Wait for backend to process, then allow refresh
      setTimeout(() => {
        isTogglingRef.current = false;
      }, 1000);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to toggle armed state');
      // Revert optimistic update on error
      isTogglingRef.current = false;
      await loadData();
    } finally {
      setSending(null);
    }
  };

  const loadMoreAlerts = () => {
    setAlertsPage((prev) => prev + 1);
  };

  const isDeviceOnline = deviceStatus?.online ?? false;
  const lastSeenSeconds = deviceStatus?.seconds_since_seen;
  
  const lastSeenText = lastSeenSeconds != null 
    ? lastSeenSeconds < 60
      ? `${Math.floor(lastSeenSeconds)}s ago`
      : lastSeenSeconds < 3600
      ? `${Math.floor(lastSeenSeconds / 60)}m ago`
      : `${Math.floor(lastSeenSeconds / 3600)}h ago`
    : 'never';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatLocationTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  // Determine which coordinates to display
  const hasCurrentLocation = deviceStatus && deviceStatus.lat != null && 
                            deviceStatus.lon != null && 
                            !(deviceStatus.lat === 0 && deviceStatus.lon === 0);
  
  const displayLocation = hasCurrentLocation 
    ? { lat: deviceStatus.lat!, lon: deviceStatus.lon!, isCurrent: true }
    : lastValidLocation 
    ? { lat: lastValidLocation.lat, lon: lastValidLocation.lon, isCurrent: false, timestamp: lastValidLocation.timestamp }
    : null;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Device Details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity style={styles.backButtonContainer} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <StatusBadge
          status={deviceStatus?.online ? 'online' : 'offline'}
          size="large"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Device Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.deviceHeader}>
            <Text style={[styles.deviceName, { color: themedColors.text }]}>{deviceStatus?.name || deviceId}</Text>
          </View>
          {!!deviceStatus?.last_status && (
            <Text style={[styles.lastStatus, { color: themedColors.textSecondary }]}>Status: {deviceStatus.last_status}</Text>
          )}
          <Text style={[styles.lastSeen, { color: themedColors.textSecondary }, !isDeviceOnline && styles.offlineText]}>
            Last seen: {lastSeenText}
          </Text>
          
          {/* Offline Warning */}
          {!isDeviceOnline && (
            <View style={styles.offlineWarning}>
              <Text style={styles.offlineWarningIcon}>⚠️</Text>
              <Text style={[styles.offlineWarningText, { color: themedColors.textSecondary }]}>
                Device is offline. Controls are disabled.
              </Text>
            </View>
          )}
        </Card>

        {/* Map Card */}
        {displayLocation ? (
          <Card style={styles.mapCard} padding={0}>
            <MapComponent
              latitude={displayLocation.lat}
              longitude={displayLocation.lon}
              deviceId={deviceId || ''}
              lastStatus={deviceStatus?.last_status || undefined}
            />
            <View style={styles.mapOverlay}>
              <Text style={[styles.coordinates, { color: themedColors.text }]}>
                📍 {displayLocation.lat.toFixed(6)}, {displayLocation.lon.toFixed(6)}
              </Text>
              {!displayLocation.isCurrent && displayLocation.timestamp && (
                <Text style={[styles.lastLocationTime, { color: themedColors.textSecondary }]}>
                  ⏱️ Last known location from {formatLocationTime(displayLocation.timestamp)}
                </Text>
              )}
            </View>
          </Card>
        ) : (
          <Card style={styles.mapCard}>
            <Text style={[styles.noLocation, { color: themedColors.textSecondary }]}>
              No location data available yet
            </Text>
          </Card>
        )}

        {/* Arm/Disarm Toggle */}
        <Card style={styles.controlCard}>
          <Text style={[styles.cardTitle, { color: themedColors.text }]}>System Security</Text>
          <CircleToggle
            isArmed={deviceStatus?.armed_state === 'armed'}
            onToggle={handleArmToggle}
            disabled={!isDeviceOnline}
            loading={sending === 'toggle'}
          />
        </Card>

        {/* Other Control Buttons */}
        <Card style={[styles.controlCard, !isDeviceOnline && styles.disabledCard].filter(Boolean) as any}>
          <Text style={[styles.cardTitle, { color: themedColors.text }]}>Device Controls</Text>
          <View style={styles.controlGrid}>
            <Button
              title="Buzz Alarm"
              onPress={() => sendCommand('BUZZ')}
              loading={sending === 'BUZZ'}
              disabled={!isDeviceOnline}
              variant="primary"
              size="medium"
              style={[styles.controlButton, !isDeviceOnline && styles.disabledButton].filter(Boolean) as any}
            />
            <Button
              title="Request Position"
              onPress={() => sendCommand('REQUEST_POSITION')}
              loading={sending === 'REQUEST_POSITION'}
              disabled={!isDeviceOnline}
              variant="secondary"
              size="medium"
              style={[styles.controlButton, !isDeviceOnline && styles.disabledButton].filter(Boolean) as any}
            />
          </View>
        </Card>

        {/* Alerts History */}
        <Card style={styles.alertsCard}>
          <Text style={[styles.cardTitle, { color: themedColors.text }]}>Recent Alerts</Text>
          {alerts.length === 0 ? (
            <Text style={[styles.noAlerts, { color: themedColors.textSecondary }]}>No alerts yet</Text>
          ) : (
            <View style={styles.alertsList}>
              {alerts.slice(0, alertsPage * 5).map((alert) => (
                <View key={alert.id} style={styles.alertItem}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertStatus, { color: themedColors.text }]}>{alert.status || 'Unknown'}</Text>
                    <Text style={[styles.alertTime, { color: themedColors.textSecondary }]}>
                      {alert.created_at ? formatDate(alert.created_at) : 'N/A'}
                    </Text>
                  </View>
                  {alert.lat != null && alert.lon != null && (
                    <Text style={[styles.alertLocation, { color: themedColors.textSecondary }]}>
                      📍 {alert.lat.toFixed(6)}, {alert.lon.toFixed(6)}
                    </Text>
                  )}
                </View>
              ))}
              
              {alerts.length > alertsPage * 5 && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMoreAlerts}
                >
                  <Text style={[styles.loadMoreText, { color: themedColors.textSecondary }]}>Load More</Text>
                  <Text style={styles.loadMoreIcon}>↓</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    flex: 1,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.offline,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  backButtonContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xxl + 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    fontWeight: '600',
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  deviceName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
    flex: 1,
  },
  lastStatus: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray200,
    marginBottom: SPACING.xs / 2,
  },
  lastSeen: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  mapCard: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
    height: 200,
  },
  noLocation: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray200,
    textAlign: 'center',
    paddingVertical: SPACING.xxl,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: SPACING.sm,
  },
  coordinates: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  lastLocationTime: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: SPACING.xs / 2,
    opacity: 0.9,
  },
  controlCard: {
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  controlGrid: {
    gap: SPACING.sm,
  },
  controlButton: {
    width: '100%',
  },
  alertsCard: {
    marginBottom: SPACING.md,
  },
  noAlerts: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray200,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  alertsList: {
    gap: SPACING.sm,
  },
  alertItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs / 2,
  },
  alertStatus: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
    flex: 1,
  },
  alertTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
  },
  alertLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray200,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  loadMoreText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadMoreIcon: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  offlineText: {
    color: COLORS.offline,
    fontWeight: '600',
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  offlineWarningIcon: {
    fontSize: FONT_SIZES.lg,
  },
  offlineWarningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.danger,
    fontWeight: '500',
  },
  disabledCard: {
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
