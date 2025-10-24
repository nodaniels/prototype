/**
 * FloorViewer - Viser plantegninger og satellitkortet
 * 
 * Hovedkomponent til visning af etager. Viser altid satellitkortet med GPS-markører,
 * men bruger plantegningen til at beregne dimensioner og konvertere relative koordinater
 * til GPS-positioner.
 */

import React, { useMemo, useState } from 'react';
import { Image, LayoutChangeEvent, Text, View } from 'react-native';
import { floorImages } from '../data/floorImages';
import type { Entrance, Room } from '../types';
import { MapViewer } from './MapViewer';
import { styles } from '../styles/FloorViewer.styles';

/** Props for FloorViewer komponenten */
interface FloorViewerProps {
  buildingKey: string; // Bygnings ID (fx 'porcelaenshaven')
  floorKey: string; // Etage ID (fx '1_sal')
  floorName: string; // Visningsnavn for etage
  room?: Room; // Lokale der skal markeres (valgfri)
  entrance?: Entrance | null; // Indgang der skal markeres (valgfri)
}

/** Dimensioner for plantegning */
interface Dimensions {
  width: number;
  height: number;
}

/** Markørposition på skærmen (før GPS konvertering) */
interface MarkerScreenPosition {
  x: number; // Pixel-position på skærmen
  y: number; // Pixel-position på skærmen
  type: 'room' | 'entrance'; // Type af markør
}

/** Radius for markører i pixels */
const markerRadius = 10;

/**
 * Beregner aspect ratio for et billede
 * @param source - Billedets ressource nummer
 * @returns Aspect ratio (bredde/højde)
 */
const computeAspectRatio = (source: number) => {
  const resolved = Image.resolveAssetSource(source);
  return resolved.width / resolved.height;
};

/**
 * Konverterer relative koordinater (0-1) til pixel-positioner
 * @param dimensions - Billedets dimensioner
 * @param point - Punkt med relative koordinater
 * @returns Position i pixels med markerRadius taget i betragtning
 */
const computePosition = (dimensions: Dimensions, point: { x: number; y: number }) => ({
  left: point.x * dimensions.width - markerRadius,
  top: point.y * dimensions.height - markerRadius,
});

/** Mapping af bygning til plantegninger */
const images = floorImages as Record<string, Record<string, number>>;

export const FloorViewer: React.FC<FloorViewerProps> = ({
  buildingKey,
  floorKey,
  floorName,
  room,
  entrance,
}: FloorViewerProps) => {
  // Hent plantegningsbillede for denne etage
  const source = images[buildingKey]?.[floorKey];
  
  // State til at gemme billedets dimensioner når det er indlæst
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  
  // Vis altid satellitkortet som standard
  const [showMap] = useState(true);

  // Tjek om der er et lokale eller indgang at vise
  const showRoom = Boolean(room);
  const showEntrance = Boolean(entrance);

  /**
   * Formaterer etage-navnet til læsbar tekst
   * Konverterer fx '1_sal' til '1. Sal'
   */
  const floorLabel = useMemo(() => {
    const normalized = floorName.replace(/_/g, ' ').trim();
    const withDot = normalized.replace(/(\d+)\s+sal/i, '$1. sal');
    return withDot
      .toLowerCase()
      .split(' ')
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
      .join(' ');
  }, [floorName]);

  /**
   * Beregner aspect ratio for plantegningen
   * Bruges til at holde korrekte proportioner ved forskellige skærmstørrelser
   */
  const aspectRatio = useMemo(() => {
    if (!source) {
      return 1;
    }
    return computeAspectRatio(source);
  }, [source]);

  /**
   * Konverterer bygnings ID til læsbart visningsnavn
   */
  const buildingDisplayName = useMemo(() => {
    const nameMap: Record<string, string> = {
      porcelaenshaven: 'Porcelænshaven',
      solbjerg: 'Solbjerg Plads',
    };
    return nameMap[buildingKey] || buildingKey;
  }, [buildingKey]);

  /**
   * Handler når billedet er indlæst og vi kan måle dimensionerne
   * Opdaterer state med de faktiske pixel-dimensioner
   */
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

  /**
   * Beregner pixel-positioner for alle markører baseret på relative koordinater
   * Disse positioner sendes til MapViewer for GPS-konvertering
   */
  const markerPositions = useMemo<MarkerScreenPosition[]>(() => {
    if (dimensions.width === 0 || !source) {
      return [];
    }
    const positions: MarkerScreenPosition[] = [];
    
    // Tilføj lokale-markør hvis relevant
    if (showRoom && room) {
      const pos = computePosition(dimensions, room);
      positions.push({
        x: pos.left + markerRadius,
        y: pos.top + markerRadius,
        type: 'room',
      });
    }
    
    // Tilføj indgangs-markør hvis relevant
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

  // Vis fejlbesked hvis plantegningen mangler
  if (!source) {
    return (
      <View style={styles.missingContainer}>
        <Text style={styles.missingText}>Floor image ikke tilgængelig.</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Forklaring (legend) for markørerne */}
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
        {/* 
          Plantegningen renderes ALTID (selvom den er skjult) fordi:
          1. Den bruges til at beregne dimensioner
          2. Den bruges til at konvertere relative koordinater til pixels
          3. Pixel-positionerne sendes til MapViewer for GPS-konvertering
        */}
        <View
          style={[
            styles.viewer,
            { aspectRatio },
            showMap ? styles.hiddenFloorPlan : null, // Skjul plantegning når kort vises
          ]}
          onLayout={handleLayout}
        >
          <Image source={source} style={styles.image} resizeMode="contain" />
          
          {/* Vis markører på plantegningen (skjult når kort vises) */}
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
          
          {/* Etage-label der viser hvilken etage der ses */}
          <View style={styles.floorBadge}>
            <Text style={styles.floorBadgeText}>{floorLabel}</Text>
          </View>
        </View>

        {/* Satellitkortet overlays plantegningen når aktivt */}
        {showMap && dimensions.width > 0 ? (
          <View style={styles.mapOverlay}>
            <MapViewer
              buildingKey={buildingKey}
              buildingName={buildingDisplayName}
              markerPositions={markerPositions} // Send pixel-positioner til GPS-konvertering
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};