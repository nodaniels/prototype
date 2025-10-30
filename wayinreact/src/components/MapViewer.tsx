/**
 * MapViewer - Satellitkortsvisning med GPS markører
 * Viser satellitbillede af bygning med brugerens position og lokale-markører
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import MapView, { Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { styles } from '../styles/MapViewer.styles';

/** Markørposition på skærmen (før GPS konvertering) */
interface MarkerScreenPosition {
  x: number;
  y: number;
  type: 'room' | 'entrance';
}

interface MapViewerProps {
  buildingKey: string;
  buildingName: string;
  markerPositions: MarkerScreenPosition[]; // Skærmpositioner der konverteres til GPS
}

/** Konfiguration for hver bygning (GPS position, zoom niveau, rotation) */
interface BuildingMapConfig {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  pitch: number; // Kamera hældning
  heading: number; // Kamera rotation
  altitude: number; // Kamera højde
  zoom: number;
}

/** GPS koordinater og kameraindstillinger for hver bygning */
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
    latitude: 55.681625854994085,
    longitude: 12.529512433992615,
    latitudeDelta: 0.001,
    longitudeDelta: 0.001,
    pitch: 0,
    heading: 269.45,
    altitude: 430,
    zoom: 17,
  },
};

// Hjælpefunktion til at tjekke om en bygning har GPS-konfiguration
export const hasMapConfiguration = (buildingKey: string): boolean => {
  return buildingKey in BUILDING_MAP_CONFIGS;
};

export const MapViewer: React.FC<MapViewerProps> = ({ buildingKey, markerPositions }) => {
  const mapRef = useRef<MapView>(null);
  const [_userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsMarkers, setGpsMarkers] = useState<Array<{ latitude: number; longitude: number; type: 'room' | 'entrance' }>>([]);

  const buildingConfig = BUILDING_MAP_CONFIGS[buildingKey];

  // Anmod om lokationstilladelser og start tracking
  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        // Anmod om tilladelse til at bruge lokation
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

        // Hent nuværende position
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setUserLocation(currentLocation);
          setLoading(false);
        }

        // Start live tracking af brugerens position
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // Opdater hvert 5. sekund
            distanceInterval: 10, // Eller når bruger flytter 10 meter
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

    // Cleanup når komponent unmountes
    return () => {
      cancelled = true;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Nulstil kamera og konverter markører når bygning skifter eller ny søgning udføres
  useEffect(() => {
    if (!mapReady || !mapRef.current || !buildingConfig) {
      return;
    }

    const resetMapAndConvertMarkers = async () => {
      // Først nulstil kamera til bygningens standardposition ØJEBLIKKELIGT
      mapRef.current!.setCamera({
        center: {
          latitude: buildingConfig.latitude,
          longitude: buildingConfig.longitude,
        },
        pitch: buildingConfig.pitch,
        heading: buildingConfig.heading,
        altitude: buildingConfig.altitude,
        zoom: buildingConfig.zoom,
      });

      // Vent en smule på at kameraet stabiliserer sig
      await new Promise(resolve => setTimeout(resolve, 50));

      // Konverter derefter markører fra skærmpositioner til GPS koordinater
      if (markerPositions.length > 0) {
        const converted: Array<{ latitude: number; longitude: number; type: 'room' | 'entrance' }> = [];
        
        for (const marker of markerPositions) {
          try {
            // coordinateForPoint konverterer pixel-koordinater til GPS
            const coordinate = await mapRef.current!.coordinateForPoint({ x: marker.x, y: marker.y });
            if (coordinate) {
              converted.push({
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                type: marker.type,
              });
            }
          } catch (error) {
            console.warn('Failed to convert marker position:', error);
          }
        }
        
        setGpsMarkers(converted);
      } else {
        // Ryd markører hvis ingen positioner er givet
        setGpsMarkers([]);
      }
    };

    resetMapAndConvertMarkers();
  }, [buildingKey, mapReady, buildingConfig, markerPositions]);

  // Vis fejl hvis bygningskonfiguration mangler
  if (!buildingConfig) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kortdata mangler for denne bygning.</Text>
      </View>
    );
  }

  // Vis loading mens lokation hentes
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
      {/* Satellitkortet med brugerens position og markører */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType="satellite"
        onMapReady={() => setMapReady(true)}
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
      >
        {/* Vis GPS markører som cirkler på kortet */}
        {gpsMarkers.map((marker, index) => (
          <Circle
            key={`${marker.type}-${index}`}
            center={{ latitude: marker.latitude, longitude: marker.longitude }}
            radius={3}
            fillColor={marker.type === 'room' ? '#22c55e' : '#f97316'}
            strokeColor={marker.type === 'room' ? '#15803d' : '#ea580c'}
            strokeWidth={2}
          />
        ))}
      </MapView>
      
      {/* Fejlbesked hvis tilladelser mangler */}
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