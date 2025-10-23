import React, { useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { floorImages } from '../data/floorImages';
import type { Entrance, Room } from '../types';
import { MapViewer } from './MapViewer';

interface FloorViewerProps {
  buildingKey: string;
  floorKey: string;
  floorName: string;
  room?: Room;
  entrance?: Entrance | null;
}

interface Dimensions {
  width: number;
  height: number;
}

interface MarkerScreenPosition {
  x: number;
  y: number;
  type: 'room' | 'entrance';
}

const markerRadius = 10;

const computeAspectRatio = (source: number) => {
  const resolved = Image.resolveAssetSource(source);
  return resolved.width / resolved.height;
};

const computePosition = (dimensions: Dimensions, point: { x: number; y: number }) => ({
  left: point.x * dimensions.width - markerRadius,
  top: point.y * dimensions.height - markerRadius,
});

const images = floorImages as Record<string, Record<string, number>>;

export const FloorViewer: React.FC<FloorViewerProps> = ({
  buildingKey,
  floorKey,
  floorName,
  room,
  entrance,
}: FloorViewerProps) => {
  const source = images[buildingKey]?.[floorKey];
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  // Always show satellite map by default
  const [showMap] = useState(true);

  const showRoom = Boolean(room);
  const showEntrance = Boolean(entrance);

  const floorLabel = useMemo(() => {
    const normalized = floorName.replace(/_/g, ' ').trim();
    const withDot = normalized.replace(/(\d+)\s+sal/i, '$1. sal');
    return withDot
      .toLowerCase()
      .split(' ')
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
      .join(' ');
  }, [floorName]);

  const aspectRatio = useMemo(() => {
    if (!source) {
      return 1;
    }
    return computeAspectRatio(source);
  }, [source]);

  const buildingDisplayName = useMemo(() => {
    const nameMap: Record<string, string> = {
      porcelaenshaven: 'Porcelænshaven',
      solbjerg: 'Solbjerg Plads',
    };
    return nameMap[buildingKey] || buildingKey;
  }, [buildingKey]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && source) {
      const resolved = Image.resolveAssetSource(source);
      const height = width / (resolved.width / resolved.height);
      setDimensions((prev) => {
        if (prev.width === width && prev.height === height) {
          return prev;
        }
        return { width, height };
      });
    }
  };

  const markerPositions = useMemo<MarkerScreenPosition[]>(() => {
    if (dimensions.width === 0 || !source) {
      return [];
    }
    const positions: MarkerScreenPosition[] = [];
    if (showRoom && room) {
      const pos = computePosition(dimensions, room);
      positions.push({
        x: pos.left + markerRadius,
        y: pos.top + markerRadius,
        type: 'room',
      });
    }
    if (showEntrance && entrance) {
      const pos = computePosition(dimensions, entrance);
      positions.push({
        x: pos.left + markerRadius,
        y: pos.top + markerRadius,
        type: 'entrance',
      });
    }
    return positions;
  }, [dimensions, room, entrance, showRoom, showEntrance, source]);

  if (!source) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Floor image ikke tilgængelig.</Text>
      </View>
    );
  }

  return (
    <View>
      {showRoom || showEntrance ? (
        <View style={styles.legend}>
          {showRoom ? (
            <>
              <View style={[styles.legendDot, styles.roomDot]} />
              <Text style={styles.legendLabel}>Søgt lokale</Text>
            </>
          ) : null}
          {showEntrance ? (
            <>
              <View style={[styles.legendDot, styles.entranceDot]} />
              <Text style={styles.legendLabel}>Nærmeste indgang</Text>
            </>
          ) : null}
        </View>
      ) : null}
      
      <View style={styles.container}>
        {/* Floor plan always renders for dimension calculation and marker positioning */}
        <View
          style={[
            styles.viewer,
            { aspectRatio },
            showMap ? styles.hiddenFloorPlan : null,
          ]}
          onLayout={handleLayout}
        >
          <Image source={source} style={styles.image} resizeMode="contain" />
          {dimensions.width > 0 ? (
            <>
              {showRoom && room ? (
                <View
                  style={[
                    styles.marker,
                    styles.roomDot,
                    computePosition(dimensions, room),
                  ]}
                />
              ) : null}
              {showEntrance && entrance ? (
                <View
                  style={[
                    styles.marker,
                    styles.entranceDot,
                    computePosition(dimensions, entrance),
                  ]}
                />
              ) : null}
            </>
          ) : null}
          <View style={styles.floorBadge}>
            <Text style={styles.floorBadgeText}>{floorLabel}</Text>
          </View>
        </View>

        {/* Satellite map overlays when active */}
        {showMap && dimensions.width > 0 ? (
          <View style={styles.mapOverlay}>
            <MapViewer
              buildingKey={buildingKey}
              buildingName={buildingDisplayName}
              markerPositions={markerPositions}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  legendLabel: {
    color: '#475467',
    fontSize: 14,
  },
  viewer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  marker: {
    position: 'absolute',
    width: markerRadius * 2,
    height: markerRadius * 2,
    borderRadius: markerRadius,
  },
  roomDot: {
    backgroundColor: '#22c55e',
    borderColor: '#15803d',
  },
  entranceDot: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  missingContainer: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
  },
  missingText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  floorBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  floorBadgeText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  container: {
    position: 'relative',
  },
  hiddenFloorPlan: {
    opacity: 0,
    position: 'absolute',
    pointerEvents: 'none',
  },
});
