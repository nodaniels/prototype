import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import buildingsPayload from './src/data/buildings.json';
import type {
  BuildingData,
  BuildingsPayload,
  Entrance,
  FloorData,
  Room,
  SearchResult,
} from './src/types';
import { BuildingPicker } from './src/components/BuildingPicker';
import { FloorViewer } from './src/components/FloorViewer';
import { listRoomIds, searchRoomInBuilding } from './src/utils/search';

const typedPayload = buildingsPayload as BuildingsPayload;

const buildingCodeMap: Record<string, keyof typeof typedPayload.buildings> = {
  SP: 'solbjerg',
  PH: 'porcelaenshaven',
};

const createCandidatesFromLocation = (
  buildingKey: keyof typeof typedPayload.buildings,
  token: string,
): string[] => {
  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    if (!value) {
      return;
    }
    const normalized = value.replace(/\s+/g, '');
    if (!normalized) {
      return;
    }
    const upper = normalized.toUpperCase();
    if (!candidates.includes(upper)) {
      candidates.push(upper);
    }
  };

  const normalizedToken = token.trim().toUpperCase();
  if (!normalizedToken) {
    return candidates;
  }

  if (buildingKey === 'solbjerg') {
    const primary = normalizedToken.replace(/[^A-Z0-9]/g, '');
    if (primary) {
      pushCandidate(primary);
      const digitsOnly = primary.replace(/\D/g, '');
      if (digitsOnly && digitsOnly !== primary) {
        pushCandidate(digitsOnly);
      }
    }
    return candidates;
  }

  if (buildingKey === 'porcelaenshaven') {
    const sanitized = normalizedToken.replace(/[^A-Z0-9.]/g, '.');
    const segments = sanitized.split('.').filter(Boolean);
    const numericSegments = segments.map((segment) => segment.replace(/\D/g, '')).filter(Boolean);
    let relevantSegments = numericSegments;
    if (numericSegments.length > 2) {
      relevantSegments = numericSegments.slice(-2);
    }

    let floorPart: string | null = null;
    let roomPart: string | null = null;

    if (relevantSegments.length >= 2) {
      [floorPart, roomPart] = relevantSegments;
    } else if (relevantSegments.length === 1) {
      roomPart = relevantSegments[0];
    }

    if (floorPart && roomPart) {
      pushCandidate(`${floorPart}${roomPart}`);
      pushCandidate(`${floorPart}.${roomPart}`);
    }
    if (roomPart) {
      pushCandidate(roomPart);
    }

    return candidates;
  }

  pushCandidate(normalizedToken.replace(/[^A-Z0-9]/g, ''));
  return candidates;
};

interface BuildingEntry {
  key: string;
  data: BuildingData;
  name: string;
}

interface DisplayedFloor {
  floorKey: string;
  floor: FloorData;
  room?: Room;
  entrance?: Entrance | null;
  fromSearch: boolean;
}

const isGroundFloor = (key: string, floor: FloorData) => {
  const haystack = `${key} ${floor.originalName}`.toLowerCase();
  return (
    haystack.includes('stue') ||
    haystack.includes('ground') ||
    /(^|[^\d])0([^\d]|$)/.test(haystack)
  );
};

const App: React.FC = () => {
  const [selectedBuildingKey, setSelectedBuildingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedFloor, setDisplayedFloor] = useState<DisplayedFloor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickLookupValue, setQuickLookupValue] = useState('');
  const [quickLookupError, setQuickLookupError] = useState<string | null>(null);
  const [quickLookupInfoVisible, setQuickLookupInfoVisible] = useState(false);

  const buildingEntries = useMemo<BuildingEntry[]>(() => {
    return Object.entries(typedPayload.buildings).map(([key, value]) => ({
      key,
      data: value,
      name: value.originalName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase()),
    }));
  }, []);

  const selectedBuilding: BuildingData | null = selectedBuildingKey
    ? typedPayload.buildings[selectedBuildingKey]
    : null;

  const roomSuggestions = useMemo(() => {
    if (!selectedBuilding) {
      return [] as string[];
    }
    return listRoomIds(selectedBuilding).slice(0, 20);
  }, [selectedBuilding]);

  const searchAcrossBuildings = useCallback(
    (query: string): { buildingKey: string; result: SearchResult } | null => {
      const normalized = query.trim().toUpperCase();
      if (!normalized) {
        return null;
      }
      for (const [buildingKey, building] of Object.entries(typedPayload.buildings)) {
        const match = searchRoomInBuilding(building, normalized);
        if (match) {
          return { buildingKey, result: match };
        }
      }
      return null;
    },
    [],
  );

  const extractRoomFromText = useCallback(
    (input: string): { buildingKey: string; result: SearchResult } | null => {
      if (!input.trim()) {
        return null;
      }

      const locationMatch = input.match(/lokalitet\s*:\s*([^\n]+)/i);
      if (locationMatch) {
        const locationValueRaw = locationMatch[1].trim();
        const locationValueUpper = locationValueRaw.toUpperCase();

        for (const [code, buildingKey] of Object.entries(buildingCodeMap)) {
          const codeIndex = locationValueUpper.indexOf(code);
          if (codeIndex === -1) {
            continue;
          }

          const remainder = locationValueRaw.slice(codeIndex + code.length).trim();
          const primaryToken = remainder.split(/\s+/)[0] ?? '';
          const building = typedPayload.buildings[buildingKey];
          if (!building) {
            continue;
          }

          const candidates = createCandidatesFromLocation(buildingKey, primaryToken);
          for (const candidate of candidates) {
            const match = searchRoomInBuilding(building, candidate);
            if (match) {
              return { buildingKey, result: match };
            }
          }
        }
      }

      const directMatch = searchAcrossBuildings(input);
      if (directMatch) {
        return directMatch;
      }

      const tokens = input.match(/[A-ZÆØÅ0-9._-]+/gi);
      if (tokens) {
        for (const token of tokens) {
          const match = searchAcrossBuildings(token);
          if (match) {
            return match;
          }
        }
      }

      return null;
    },
    [searchAcrossBuildings],
  );

  const applySearchResult = useCallback(
    (buildingKey: string, result: SearchResult) => {
      setSelectedBuildingKey(buildingKey);
      setSearchQuery(result.room.id);
      setQuickLookupError(null);
      setDisplayedFloor({
        floorKey: result.floorKey,
        floor: result.floor,
        room: result.room,
        entrance: result.entrance,
        fromSearch: true,
      });
      setErrorMessage(null);
    },
    [],
  );

  const handleQuickLookup = useCallback(() => {
    if (!quickLookupValue.trim()) {
      setQuickLookupError('Indsæt et lokalenummer');
      return;
    }

    const match = extractRoomFromText(quickLookupValue);
    if (!match) {
      setQuickLookupError('Kunne ikke finde lokalet. Tjek at nummeret er korrekt.');
      return;
    }

    setQuickLookupError(null);
    applySearchResult(match.buildingKey, match.result);
  }, [applySearchResult, extractRoomFromText, quickLookupValue]);

  const handleSelectBuilding = useCallback((key: string) => {
    setSelectedBuildingKey(key);
    setSearchQuery('');
    setErrorMessage(null);
    setQuickLookupError(null);

    const building = typedPayload.buildings[key];
    if (!building) {
      setDisplayedFloor(null);
      return;
    }

    const entries = Object.entries(building.floors);
    const defaultEntry =
      entries.find(([floorKey, floor]) => isGroundFloor(floorKey, floor)) ?? entries[0];

    if (defaultEntry) {
      const [floorKeyDefault, floorDefault] = defaultEntry;
      setDisplayedFloor({
        floorKey: floorKeyDefault,
        floor: floorDefault,
        fromSearch: false,
      });
    } else {
      setDisplayedFloor(null);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    if (selectedBuilding && selectedBuildingKey) {
      const result = searchRoomInBuilding(selectedBuilding, trimmedQuery);
      if (!result) {
        setErrorMessage('Kunne ikke finde lokalet. Tjek at nummeret er korrekt.');
        return;
      }
      applySearchResult(selectedBuildingKey, result);
      return;
    }

    const globalMatch = extractRoomFromText(trimmedQuery);
    if (!globalMatch) {
      setErrorMessage('Kunne ikke finde lokalet. Vælg en bygning eller indsæt et gyldigt lokalenummer.');
      return;
    }

    applySearchResult(globalMatch.buildingKey, globalMatch.result);
  }, [
    applySearchResult,
    extractRoomFromText,
    searchQuery,
    selectedBuilding,
    selectedBuildingKey,
  ]);

  const handleSuggestionPress = useCallback(
    (roomId: string) => {
      if (!selectedBuilding || !selectedBuildingKey) {
        return;
      }
      const result = searchRoomInBuilding(selectedBuilding, roomId);
      if (!result) {
        return;
      }
      applySearchResult(selectedBuildingKey, result);
    },
    [applySearchResult, selectedBuilding, selectedBuildingKey],
  );

  const handleBack = useCallback(() => {
    setSelectedBuildingKey(null);
    setSearchQuery('');
    setDisplayedFloor(null);
    setErrorMessage(null);
    setQuickLookupError(null);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboardAvoider}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              {selectedBuilding ? (
                <Pressable onPress={handleBack} style={styles.backButton} accessibilityRole="button">
                  <Text style={styles.backLabel}>← Tilbage</Text>
                </Pressable>
              ) : (
                <>
                    <Text style={[styles.title, { color: '#1D4ED8' }]}>WayInn™</Text>
                </>
              )}
            </View>

            {!selectedBuilding ? (
              <View style={styles.landing}>
                <View style={styles.quickLookupCard}>
                  <View style={styles.quickLookupHeader}>
                    <Text style={styles.quickLookupTitle}>Indsæt kalendertekst</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setQuickLookupInfoVisible(true)}
                      style={styles.quickLookupInfoButton}
                    >
                      <Text style={styles.quickLookupInfoLabel}>i</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    value={quickLookupValue}
                    onChangeText={(value) => {
                      setQuickLookupValue(value);
                      setQuickLookupError(null);
                    }}
                    placeholder="Fx “Statusmøde i S10” eller “Lokale R2.17, Solbjerg”"
                    placeholderTextColor="#94a3b8"
                    style={styles.quickLookupInput}
                    multiline
                    textAlignVertical="top"
                    autoCorrect={false}
                    onSubmitEditing={handleQuickLookup}
                    blurOnSubmit
                  />
                  <Pressable style={styles.quickLookupButton} onPress={handleQuickLookup}>
                    <Text style={styles.quickLookupButtonLabel}>Find lokale</Text>
                  </Pressable>
                  {quickLookupError ? <Text style={styles.error}>{quickLookupError}</Text> : null}
                </View>

                <View style={styles.buildingPickerSection}>
                  <BuildingPicker
                    buildings={buildingEntries.map((entry: BuildingEntry) => ({
                      key: entry.key,
                      name: entry.name,
                      description: `${Object.keys(entry.data.floors).length} etager`,
                    }))}
                    onSelect={handleSelectBuilding}
                  />
                </View>
              </View>
            ) : (
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
                    onSubmitEditing={handleSearch}
                  />
                  <Pressable style={styles.searchButton} onPress={handleSearch}>
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
                      buildingKey={selectedBuildingKey!}
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
                          onPress={() => handleSuggestionPress(roomId)}
                          style={styles.suggestionChip}
                        >
                          <Text style={styles.suggestionText}>{roomId}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={quickLookupInfoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQuickLookupInfoVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            style={StyleSheet.absoluteFill}
            onPress={() => setQuickLookupInfoVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sådan gør du</Text>
            <Text style={styles.modalBody}>
              Åbn din kalender og kopier teksten fra undervisningstimen med lokalenummeret. Indsæt den
              herefter i feltet, så finder vi automatisk det rigtige lokale for dig.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.modalCloseButton}
              onPress={() => setQuickLookupInfoVisible(false)}
            >
              <Text style={styles.modalCloseLabel}>Forstået</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
  },
  landing: {
    gap: 28,
  },
  quickLookupCard: {
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  quickLookupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickLookupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickLookupInfoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLookupInfoLabel: {
    color: '#0369a1',
    fontWeight: '700',
  },
  quickLookupDescription: {
    color: '#475467',
    lineHeight: 20,
  },
  quickLookupInput: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5f5',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  quickLookupButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickLookupButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  quickLookupHint: {
    color: '#64748b',
    fontSize: 13,
  },
  buildingPickerSection: {
    gap: 12,
  },
  searchSection: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    color: '#475467',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5f5',
    color: '#0f172a',
  },
  searchButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: '#ef4444',
    fontWeight: '600',
  },
  suggestionContainer: {
    gap: 12,
  },
  suggestionLabel: {
    color: '#475467',
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  suggestionText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  resultCard: {
    gap: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#020617',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  resultSubtitle: {
    color: '#475467',
  },
  placeholder: {
    gap: 8,
    padding: 24,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    alignItems: 'flex-start',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholderSubtitle: {
    color: '#475467',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    gap: 16,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#020617',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    color: '#475467',
    lineHeight: 20,
  },
  modalCloseButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalCloseLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
