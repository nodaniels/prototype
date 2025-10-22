import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

interface MapViewerProps {
  buildingKey: string;
  buildingName: string;
}

interface BuildingMapConfig {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  pitch: number;
  heading: number;
  altitude: number;
  zoom: number;
}

const BUILDING_MAP_CONFIGS: Record<string, BuildingMapConfig> = {
  porcelaenshaven: {
    latitude: 55.67797960379468,
    longitude: 12.522188107350989,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001,
    pitch: 0,
    heading: 277.8,
    altitude: 400,
    zoom: 20,
  },
  solbjerg: {
    latitude: 55.681725854994085,
    longitude: 12.529512433992615,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001,
    pitch: 0,
    heading: 0,
    altitude: 800,
    zoom: 17,
  },
};

export const MapViewer: React.FC<MapViewerProps> = ({ buildingKey, buildingName }) => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) {
          return;
        }

        if (status !== 'granted') {
          setPermissionGranted(false);
          setErrorMessage('Adgang til lokation er nødvendig for at se din position på kortet.');
          setLoading(false);
          return;
        }

        setPermissionGranted(true);
        setErrorMessage(null);

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setUserLocation(currentLocation);
          setLoading(false);
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (location) => {
            if (!cancelled) {
              setUserLocation(location);
            }
          },
        );
      } catch (error) {
        if (!cancelled) {
          console.warn('Lokationsfejl:', error);
          setErrorMessage('Kunne ikke hente din lokation.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const buildingConfig = BUILDING_MAP_CONFIGS[buildingKey];

  if (!buildingConfig) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kortdata mangler for denne bygning.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Henter din lokation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType="satellite"
        initialRegion={{
          latitude: buildingConfig.latitude,
          longitude: buildingConfig.longitude,
          latitudeDelta: buildingConfig.latitudeDelta,
          longitudeDelta: buildingConfig.longitudeDelta,
        }}
        initialCamera={{
          center: {
            latitude: buildingConfig.latitude,
            longitude: buildingConfig.longitude,
          },
          pitch: buildingConfig.pitch,
          heading: buildingConfig.heading,
          altitude: buildingConfig.altitude,
          zoom: buildingConfig.zoom,
        }}
        showsUserLocation={permissionGranted}
        showsMyLocationButton={permissionGranted}
        showsCompass
        showsScale
        showsBuildings
        showsTraffic={false}
        showsIndoors
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
      />
      {errorMessage && !permissionGranted ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
          <Text style={styles.errorBannerSubtext}>
            Aktivér lokationstjenester i Indstillinger for at se din position.
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 400,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    gap: 12,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#020617',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  errorBannerText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBannerSubtext: {
    color: '#991b1b',
    fontSize: 12,
  },
  infoBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#020617',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  infoBannerText: {
    color: '#1e40af',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
});
