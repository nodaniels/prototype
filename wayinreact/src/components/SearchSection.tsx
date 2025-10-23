import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FloorViewer } from './FloorViewer';
import type { BuildingData, DisplayedFloor } from '../types';

interface SearchSectionProps {
  selectedBuilding: BuildingData;
  selectedBuildingKey: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  errorMessage: string | null;
  displayedFloor: DisplayedFloor | null;
  roomSuggestions: string[];
  onSearch: () => void;
  onSuggestionPress: (roomId: string) => void;
}

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
      <Text style={styles.sectionTitle}>{selectedBuilding.originalName.toUpperCase()}</Text>
      <Text style={styles.sectionSubtitle}>Indtast et lokale-navn (fx S10, R2.17, A101)</Text>

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

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

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
          <FloorViewer
            buildingKey={selectedBuildingKey}
            floorKey={displayedFloor.floorKey}
            floorName={displayedFloor.floor.originalName}
            room={displayedFloor.room}
            entrance={displayedFloor.entrance}
          />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>Søg for at se etagekortet</Text>
          <Text style={styles.placeholderSubtitle}>
            Vi viser automatisk den rigtige etage og markerer lokalet med grønt.
          </Text>
        </View>
      )}

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

const styles = StyleSheet.create({
  searchSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  searchButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  searchButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  resultCard: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  placeholder: {
    padding: 48,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  suggestionContainer: {
    marginTop: 12,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  suggestionText: {
    color: '#3730a3',
    fontWeight: '600',
    fontSize: 13,
  },
});
