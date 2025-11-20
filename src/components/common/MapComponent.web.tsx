import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  lastStatus?: string;
}

// Web fallback component - NO react-native-maps import
export const MapComponent: React.FC<MapComponentProps> = ({ latitude, longitude }) => {
  const openInMaps = () => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.webMapContainer}>
      <Text style={styles.webMapTitle}>📍 Device Location</Text>
      <Text style={styles.webMapText}>
        Latitude: {latitude.toFixed(6)}
      </Text>
      <Text style={styles.webMapText}>
        Longitude: {longitude.toFixed(6)}
      </Text>
      <TouchableOpacity onPress={openInMaps} style={styles.mapButton}>
        <Text style={styles.mapButtonText}>Open in OpenStreetMap →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  webMapContainer: {
    width: '100%',
    height: 250,
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  webMapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  webMapText: {
    fontSize: 14,
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  mapButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  mapButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
