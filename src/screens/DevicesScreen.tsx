import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import { deviceAPI, Device, DeviceCurrentStatus } from '../services/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DevicesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceCurrentStatus>>(
    new Map()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const devicesData = await deviceAPI.getMyDevices();
      
      // Validate data before setting state
      if (!Array.isArray(devicesData)) {
        console.error('Invalid devices data:', devicesData);
        return;
      }
      
      setDevices(devicesData);

      const statusPromises = devicesData.map((device) => {
        if (!device || !device.id) {
          console.warn('Invalid device object:', device);
          return Promise.resolve(null);
        }
        return deviceAPI.getDeviceCurrentStatus(device.id).catch((err) => {
          console.warn(`Failed to get status for device ${device.id}:`, err);
          return null;
        });
      });
      
      const statuses = await Promise.all(statusPromises);

      const statusMap = new Map();
      statuses.forEach((status, index) => {
        if (status && devicesData[index]) {
          statusMap.set(devicesData[index].id, status);
        }
      });
      setDeviceStatuses(statusMap);
    } catch (error: any) {
      console.error('Failed to load devices:', error);
      
      // Check if it's an auth error
      if (error?.response?.status === 401 || error?.isAuthError) {
        console.log('Auth error detected, redirecting to login');
        router.replace('/');
      } else {
        Alert.alert(
          'Error',
          'Failed to load devices. Please check your connection and try again.'
        );
      }
    }
  }, [router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDevices();
    
    // Auto refresh every 10 seconds
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, [loadDevices]);

  useEffect(() => {
    if (params?.showAddDevice) {
      setShowAddModal(true);
    }
  }, [params]);

  const handleAddDevice = useCallback(async () => {
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
      await loadDevices();
      Alert.alert('Success', 'Device added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add device');
    } finally {
      setAddingDevice(false);
    }
  }, [newDeviceId, newDeviceName, loadDevices]);

  // Memoize filtered devices to avoid recalculation on every render
  const filteredDevices = useMemo(() => {
    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const renderDevice = useCallback(({ item }: { item: Device }) => {
    // Add null check for item
    if (!item || !item.id) {
      console.warn('Invalid device item:', item);
      return null;
    }
    
    const status = deviceStatuses.get(item.id);
    const isOnline = status?.online ?? false;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/device-detail?deviceId=${item.id}`)}
        activeOpacity={isOnline ? 0.7 : 0.9}
      >
        <Card style={[styles.deviceCard, !isOnline && styles.offlineDeviceCard]}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceName, !isOnline && styles.offlineText]}>
                {item.name || 'Unknown Device'}
              </Text>
              <Text style={[styles.deviceId, !isOnline && styles.offlineSubtext]}>
                {item.id}
              </Text>
            </View>
            <StatusBadge status={isOnline ? 'online' : 'offline'} />
          </View>

          {!!status && (
            <View style={styles.deviceStats}>
              {!!status.last_status && (
                <Text style={[styles.statText, !isOnline && styles.offlineSubtext]}>
                  📋 {status.last_status}
                </Text>
              )}
              {status.lat != null && status.lon != null && (
                <Text style={[styles.statText, !isOnline && styles.offlineSubtext]}>
                  📍 {status.lat.toFixed(6)}, {status.lon.toFixed(6)}
                </Text>
              )}
              {status.seconds_since_seen != null && (
                <Text style={[styles.statText, !isOnline && styles.offlineSubtext]}>
                  ⏱️ {Math.floor(status.seconds_since_seen)}s ago
                </Text>
              )}
            </View>
          )}
          
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>Controls Disabled</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  }, [deviceStatuses, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Devices</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search devices..."
          placeholderTextColor={COLORS.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Devices List */}
      <FlatList
        data={filteredDevices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Add your first device'}
            </Text>
          </View>
        }
      />

      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Device</Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Device ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MOTOR-ABC123"
                  value={newDeviceId}
                  onChangeText={setNewDeviceId}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Device Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. My Honda Beat"
                  value={newDeviceName}
                  onChangeText={setNewDeviceName}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  onPress={() => setShowAddModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Add Device"
                  onPress={handleAddDevice}
                  loading={addingDevice}
                  style={styles.modalButton}
                />
              </View>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xxl + 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.gray900,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: FONT_SIZES.md,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  listContent: {
    padding: SPACING.lg,
  },
  deviceCard: {
    marginBottom: SPACING.md,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: SPACING.xs / 2,
  },
  deviceId: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  deviceStats: {
    gap: SPACING.xs / 2,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.gray900,
    marginBottom: SPACING.lg,
  },
  modalForm: {
    gap: SPACING.md,
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.gray900,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
  },
  offlineDeviceCard: {
    opacity: 0.7,
    backgroundColor: COLORS.gray50,
  },
  offlineText: {
    color: COLORS.gray600,
  },
  offlineSubtext: {
    color: COLORS.gray400,
  },
  offlineBadge: {
    marginTop: SPACING.sm,
    backgroundColor: '#fef2f2',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  offlineBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: '#991b1b',
    fontWeight: '600',
  },
});
