import React, { useMemo } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

type LeafletMapProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  deviceId?: string;
  lastStatus?: string;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  zoom = 15,
  deviceId,
  lastStatus,
}) => {
  const html = useMemo(
    () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />
          <style>
            html, body, #map {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>

          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            (function() {
              var map = L.map('map').setView(
                [${latitude}, ${longitude}],
                ${zoom}
              );

              // Using Carto Light tiles - no Google, no API key needed
              L.tileLayer(
                'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
                {
                  maxZoom: 19,
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                }
              ).addTo(map);

              // Add marker with optional popup
              var marker = L.marker([${latitude}, ${longitude}]).addTo(map);
              ${
                deviceId
                  ? `marker.bindPopup('<b>${deviceId}</b>${
                      lastStatus ? '<br>' + lastStatus : ''
                    }');`
                  : ''
              }
            })();
          </script>
        </body>
      </html>
    `,
    [latitude, longitude, zoom, deviceId, lastStatus]
  );

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <WebView originWhitelist={["*"]} source={{ html }} />
      <TouchableOpacity style={styles.mapsButton} onPress={openInGoogleMaps} activeOpacity={0.8}>
        <Text style={styles.mapsButtonText}>🗺️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 12,
    position: "relative",
  },
  mapsButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mapsButtonText: {
    fontSize: 20,
  },
});
