import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LeafletMap } from './LeafletMap';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  lastStatus?: string;
}

// Leaflet-based map component - WebView with OSM tiles (no Google SDK!)
export const MapComponent: React.FC<MapComponentProps> = ({
  latitude,
  longitude,
  deviceId,
  lastStatus,
}) => {
  return (
    <View style={styles.map}>
      <LeafletMap
        latitude={latitude}
        longitude={longitude}
        deviceId={deviceId}
        lastStatus={lastStatus}
        zoom={15}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 250,
  },
});
