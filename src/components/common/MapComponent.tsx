import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  deviceId: string;
  lastStatus?: string;
}

// Native map component - uses CartoDB OSM tiles (free, no auth required)
export const MapComponent: React.FC<MapComponentProps> = ({
  latitude,
  longitude,
  deviceId,
  lastStatus,
}) => {
  return (
    <MapView
      style={styles.map}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      <UrlTile
        urlTemplate="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
        subdomains={['a', 'b', 'c', 'd']}
      />
      <Marker
        coordinate={{
          latitude,
          longitude,
        }}
        title={deviceId}
        description={lastStatus || 'Device location'}
      />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 250,
  },
});
