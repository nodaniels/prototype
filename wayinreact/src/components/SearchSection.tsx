/**
 * SearchSection - Søgning efter lokaler
 * 
 * Håndterer søgefeltet, resultater og visning af FloorViewer.
 * Viser også forslag til populære lokaler.
 */

import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FloorViewer } from './FloorViewer';
import type { BuildingData, DisplayedFloor } from '../types';
import { styles } from '../styles/SearchSection.styles';

/** Props for SearchSection komponenten */
interface SearchSectionProps {
  selectedBuilding: BuildingData; // Den valgte bygning
  selectedBuildingKey: string; // Bygningens ID
  searchQuery: string; // Nuværende søgetekst
  setSearchQuery: (query: string) => void; // Opdater søgetekst
  errorMessage: string | null; // Fejlbesked ved ugyldigt søgning
  displayedFloor: DisplayedFloor | null; // Den etage der vises
  roomSuggestions: string[]; // Forslag til populære lokaler
  onSearch: () => void; // Udfør søgning
  onSuggestionPress: (roomId: string) => void; // Tryk på et forslag
}

/**
 * Viser søgefelt, resultater og plantegning/kort
 * Inkluderer også forslag til hurtige søgninger
 */
export const SearchSection: React.FC<SearchSectionProps> = ({
  selectedBuilding,
  selectedBuildingKey,
  searchQuery,
  setSearchQuery,
  errorMessage,
  displayedFloor,
  roomSuggestions,
  onSearch,
  onSuggestionPress,
}) => {
  return (
    <View style={styles.searchSection}>
      {/* Bygningsnavn som overskrift */}
      <Text style={styles.sectionTitle}>{selectedBuilding.originalName.toUpperCase()}</Text>
      <Text style={styles.sectionSubtitle}>Indtast et lokale-navn (fx S10, R2.17, A101)</Text>

      {/* Søgefelt med knap */}
      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Søg efter lokale"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.searchButton} onPress={onSearch}>
          <Text style={styles.searchButtonLabel}>Søg</Text>
        </Pressable>
      </View>

      {/* Fejlbesked hvis søgningen fejler */}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {/* Vis resultat eller placeholder */}
      {displayedFloor ? (
        <View style={styles.resultCard}>
          {displayedFloor.room ? (
            <>
              <Text style={styles.resultTitle}>
                Fundet {displayedFloor.room.id} på {displayedFloor.floor.originalName}
              </Text>
              {displayedFloor.entrance ? (
                <Text style={styles.resultSubtitle}>
                  Nærmeste indgang markeret med orange prik
                </Text>
              ) : (
                <Text style={styles.resultSubtitle}>
                  Ingen indgang fundet – viser kun lokalet
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.resultTitle}>
                Viser {displayedFloor.floor.originalName}
              </Text>
              <Text style={styles.resultSubtitle}>
                Ingen søgning endnu – stueetagen vises som udgangspunkt.
              </Text>
            </>
          )}
          {/* Vis plantegning/satellitkortet */}
          <FloorViewer
            buildingKey={selectedBuildingKey}
            floorKey={displayedFloor.floorKey}
            floorName={displayedFloor.floor.originalName}
            room={displayedFloor.room}
            entrance={displayedFloor.entrance}
          />
        </View>
      ) : (
        // Placeholder når der ikke er søgt endnu
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Søg for at se etagekortet</Text>
          <Text style={styles.placeholderSubtitle}>
            Vi viser automatisk den rigtige etage og markerer lokalet med grønt.
          </Text>
        </View>
      )}

      {/* Forslag til populære lokaler */}
      {roomSuggestions.length > 0 ? (
        <View style={styles.suggestionContainer}>
          <Text style={styles.suggestionLabel}>Populære lokaler</Text>
          <View style={styles.suggestionRow}>
            {roomSuggestions.map((roomId: string) => (
              <Pressable
                key={roomId}
                onPress={() => onSuggestionPress(roomId)}
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{roomId}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};