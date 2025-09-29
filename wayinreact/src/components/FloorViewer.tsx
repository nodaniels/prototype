import React, { useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { floorImages } from '../data/floorImages';
import type { Entrance, Room } from '../types';

interface FloorViewerProps {
  buildingKey: string;
  floorKey: string;
  room: Room;
  entrance: Entrance | null;
}

interface Dimensions {
  width: number;
  height: number;
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
  room,
  entrance,
}: FloorViewerProps) => {
  const source = images[buildingKey]?.[floorKey];
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  const aspectRatio = useMemo(() => {
    if (!source) {
      return 1;
    }
    return computeAspectRatio(source);
  }, [source]);

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

  if (!source) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Floor image ikke tilgængelig.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, styles.roomDot]} />
        <Text style={styles.legendLabel}>Søgt lokale</Text>
        {entrance ? (
          <>
            <View style={[styles.legendDot, styles.entranceDot]} />
            <Text style={styles.legendLabel}>Nærmeste indgang</Text>
          </>
        ) : null}
      </View>
      <View style={[styles.viewer, { aspectRatio }]} onLayout={handleLayout}>
        <Image source={source} style={styles.image} resizeMode="contain" />
        {dimensions.width > 0 ? (
          <>
            <View
              style={[
                styles.marker,
                styles.roomDot,
                computePosition(dimensions, room),
              ]}
            />
            {entrance ? (
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
});
