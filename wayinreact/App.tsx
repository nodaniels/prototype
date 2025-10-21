import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';

import { FIREBASE_DB_URL, FIREBASE_AUTH } from './src/config';
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

// Empty fallback payload used until remote or local data is loaded
const emptyPayload: BuildingsPayload = { buildings: {} } as BuildingsPayload;

// App will hold the active payload in state and try to fetch remote data on mount.

// At startup we'll attempt to fetch a remote buildings payload from the Firebase Realtime DB.
// If that fails we fall back to the local JSON bundled with the app.
const fetchRemoteBuildings = async (): Promise<BuildingsPayload | null> => {
  try {
    const url = `${FIREBASE_DB_URL.replace(/\/$/, '')}/buildings.json`;
    const params = FIREBASE_AUTH ? `?auth=${encodeURIComponent(FIREBASE_AUTH)}` : '';
    const resp = await fetch(url + params, { cache: 'no-store' });
    if (!resp.ok) {
      console.warn('Failed to fetch remote buildings:', resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    // Basic validation: must have buildings key
    if (!data || typeof data !== 'object' || !data.buildings) {
      console.warn('Remote buildings payload invalid');
      return null;
    }
    return data as BuildingsPayload;
  } catch (err) {
    console.warn('Error fetching remote buildings:', err);
    return null;
  }
};

// NOTE: payload will be populated at runtime (remote or local fallback). We use
// `typedPayloadFallback` for initial typing; the runtime `payload` state holds the active data.
const buildingCodeMap: Record<string, string> = {
  SP: 'solbjerg',
  PH: 'porcelaenshaven',
};

const createCandidatesFromLocation = (
  buildingKey: string,
  token: string,
  context?: string,
  buildingCode?: string,
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
  const contextTokens = (() => {
    if (!context) {
      return normalizedToken ? [normalizedToken] : [];
    }
    const extracted = context
      .split(/[\s,.;:()•-]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.toUpperCase());
    if (normalizedToken) {
      extracted.unshift(normalizedToken);
    }
    return Array.from(new Set(extracted)).slice(0, 5);
  })();

  if (!contextTokens.length) {
    return candidates;
  }

  if (buildingKey === 'solbjerg') {
    const addVariants = (raw: string) => {
      const sanitized = raw.replace(/[^A-Z0-9]/g, '');
      if (!sanitized) {
        return;
      }
      pushCandidate(sanitized);

      if (buildingCode) {
        pushCandidate(`${buildingCode}${sanitized}`);
      }

      const digitsOnly = sanitized.replace(/\D/g, '');
      if (digitsOnly) {
        pushCandidate(digitsOnly);
        if (buildingCode) {
          pushCandidate(`${buildingCode}${digitsOnly}`);
        }
      }
    };

    contextTokens.forEach(addVariants);

    for (let i = 0; i < contextTokens.length - 1; i += 1) {
      const combined = `${contextTokens[i]}${contextTokens[i + 1]}`;
      addVariants(combined);
    }
    return candidates;
  }

  if (buildingKey === 'porcelaenshaven') {
    const primaryToken = contextTokens[0] ?? '';
    const sanitized = primaryToken.replace(/[^A-Z0-9.]/g, '.');
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

    contextTokens.slice(1, 3).forEach((part) => {
      const cleaned = part.replace(/[^A-Z0-9.]/g, '');
      if (cleaned) {
        pushCandidate(cleaned);
      }
    });

    return candidates;
  }

  contextTokens.forEach((value) => {
    pushCandidate(value.replace(/[^A-Z0-9]/g, ''));
  });
  return candidates;
};

type TabKey = 'home' | 'institutions' | 'settings';

interface InstitutionOption {
  id: string;
  name: string;
  organization: string;
  region: string;
  campuses: string[];
}

type PermissionState = 'undetermined' | 'granted' | 'denied';

interface CalendarEventSummary {
  id: string;
  title: string;
  startDate: Date;
  location?: string | null;
}

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
  const [payload, setPayload] = useState<BuildingsPayload>(emptyPayload);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedFloor, setDisplayedFloor] = useState<DisplayedFloor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickLookupValue, setQuickLookupValue] = useState('');
  const [quickLookupError, setQuickLookupError] = useState<string | null>(null);
  const [quickLookupInfoVisible, setQuickLookupInfoVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [calendarPermissionStatus, setCalendarPermissionStatus] =
    useState<PermissionState>('undetermined');
  const [calendarLookupLoading, setCalendarLookupLoading] = useState(false);
  const [calendarLookupError, setCalendarLookupError] = useState<string | null>(null);
  const [calendarLookupMessage, setCalendarLookupMessage] = useState<string | null>(null);
  const [calendarLastEvent, setCalendarLastEvent] = useState<CalendarEventSummary | null>(null);

  const refreshCalendarPermission = useCallback(async () => {
    try {
      const response = await Calendar.getCalendarPermissionsAsync();
      setCalendarPermissionStatus(response.status as PermissionState);
    } catch (error) {
      console.warn('Failed to read calendar permission status', error);
      setCalendarPermissionStatus('denied');
    }
  }, []);

  const ensureCalendarAccess = useCallback(async () => {
    try {
      const current = await Calendar.getCalendarPermissionsAsync();
      setCalendarPermissionStatus(current.status as PermissionState);
      if (current.status === 'granted') {
        setCalendarLookupError(null);
        return true;
      }

      if (current.status === 'denied' && !current.canAskAgain) {
        setCalendarLookupMessage(null);
        setCalendarLookupError(
          'WayInn mangler adgang til din kalender. Aktivér tilladelsen i Indstillinger.',
        );
        return false;
      }

      const requested = await Calendar.requestCalendarPermissionsAsync();
      setCalendarPermissionStatus(requested.status as PermissionState);
      if (requested.status !== 'granted') {
        setCalendarLookupMessage(null);
        setCalendarLookupError(
          'WayInn fik ikke adgang til kalenderen. Åbn Indstillinger for at aktivere tilladelsen.',
        );
        return false;
      }

      setCalendarLookupError(null);
      return true;
    } catch (error) {
      console.warn('Calendar permission error', error);
      setCalendarLookupMessage(null);
      setCalendarLookupError('Der opstod en fejl ved anmodning om kalenderadgang.');
      return false;
    }
  }, []);

  // On mount, try to fetch remote payload and replace local data if successful.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteBuildings();
      if (remote && !cancelled) {
        setPayload(remote);
        return;
      }

      // remote failed — attempt to dynamically load the local JSON fallback if present
      // Remote fetch failed; leave payload empty until data becomes available.
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      await refreshCalendarPermission();
    })();
  }, [refreshCalendarPermission]);

  const institutionOptions = useMemo<InstitutionOption[]>(
    () => [
      {
        id: 'novo',
        name: 'Novo Nordisk',
        organization: 'Life science',
        region: 'Bagsværd, Danmark',
        campuses: ['Bagsværd HQ', 'Fremtidens laboratorier', 'Kalundborg Production'],
      },
      {
        id: 'cbs',
        name: 'Copenhagen Business School',
        organization: 'Universitet',
        region: 'Frederiksberg, København',
        campuses: ['Solbjerg Campus', 'Porcelænshaven Campus', 'Dalgas Have'],
      },
      {
        id: 'maersk',
        name: 'A.P. Møller - Mærsk',
        organization: 'Shipping & logistics',
        region: 'København Ø, Danmark',
        campuses: ['Esplanaden HQ', 'Terminal Operations'],
      },
    ],
    [],
  );
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(
    () => institutionOptions[0]?.id ?? null,
  );
  const selectedInstitution = useMemo(() => {
    return (
      institutionOptions.find((option) => option.id === selectedInstitutionId) ??
      institutionOptions[0] ??
      null
    );
  }, [institutionOptions, selectedInstitutionId]);

  const calendarLastEventSummary = useMemo(() => {
    if (!calendarLastEvent) {
      return null;
    }
    const formatted = calendarLastEvent.startDate.toLocaleString('da-DK', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const locationPart = calendarLastEvent.location?.trim()
      ? ` • ${calendarLastEvent.location.trim()}`
      : '';
    return `${formatted}${locationPart}`;
  }, [calendarLastEvent]);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const buildingEntries = useMemo<BuildingEntry[]>(() => {
    return Object.entries(payload.buildings).map(([key, value]) => ({
      key,
      data: value as BuildingData,
      name: (value as BuildingData).originalName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase()),
    }));
  }, [payload]);

  const selectedBuilding: BuildingData | null = selectedBuildingKey
    ? (payload.buildings[selectedBuildingKey] as BuildingData)
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
      for (const [buildingKey, building] of Object.entries(payload.buildings)) {
        const match = searchRoomInBuilding(building as BuildingData, normalized);
        if (match) {
          return { buildingKey, result: match };
        }
      }
      return null;
    },
    [payload],
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
          const building = payload.buildings[buildingKey] as BuildingData;
          if (!building) {
            continue;
          }

          const candidates = createCandidatesFromLocation(
            buildingKey,
            primaryToken,
            remainder,
            code,
          );
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
        for (const rawToken of tokens) {
          const normalizedToken = rawToken.trim().toUpperCase();
          if (!normalizedToken) {
            continue;
          }

          const variants = new Set<string>([normalizedToken]);
          const sanitized = normalizedToken.replace(/[^A-Z0-9]/g, '');
          if (sanitized) {
            variants.add(sanitized);
            const digitsOnly = sanitized.replace(/\D/g, '');
            if (digitsOnly) {
              variants.add(digitsOnly);
            }
            const withoutPrefix = sanitized.replace(/^[A-Z]{1,3}/, '');
            if (withoutPrefix && withoutPrefix !== sanitized) {
              variants.add(withoutPrefix);
            }
          }

          for (const [code, buildingKey] of Object.entries(buildingCodeMap)) {
            const building = payload.buildings[buildingKey] as BuildingData | undefined;
            if (!building) {
              continue;
            }
            if (normalizedToken.startsWith(code)) {
              const remainder = normalizedToken.slice(code.length).trim();
              if (remainder) {
                variants.add(remainder);
                variants.add(remainder.replace(/[^A-Z0-9]/g, ''));
              }
            }
            const locationVariants = createCandidatesFromLocation(
              buildingKey,
              normalizedToken,
              normalizedToken,
              code,
            );
            locationVariants.forEach((variant) => variants.add(variant));
          }

          for (const variant of variants) {
            const match = searchAcrossBuildings(variant);
            if (match) {
              return match;
            }
          }
        }
      }

      return null;
    },
    [payload, searchAcrossBuildings],
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

  const handleCalendarLookup = useCallback(async () => {
    setCalendarLookupError(null);
    setCalendarLookupMessage('Finder næste kalenderaftale...');
    setCalendarLookupLoading(true);
    try {
      const hasAccess = await ensureCalendarAccess();
      if (!hasAccess) {
        setCalendarLookupMessage(null);
        return;
      }

      const now = new Date();
      const end = new Date(now.getTime() + 1000 * 60 * 60 * 48);
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const calendarIds = calendars.map((calendar) => calendar.id).filter(Boolean);
      if (!calendarIds.length) {
        setCalendarLookupMessage(null);
        setCalendarLastEvent(null);
        setCalendarLookupError('Ingen kalendere fundet på enheden.');
        return;
      }

      const eventsArrays = await Promise.all(
        calendarIds.map(async (id) => {
          try {
            return await Calendar.getEventsAsync([id], now, end);
          } catch (error) {
            console.warn(`Failed to fetch events for calendar ${id}`, error);
            return [];
          }
        }),
      );

      const eventsWithStart = eventsArrays
        .flat()
        .map((event) => ({
          event,
          startDate: event.startDate ? new Date(event.startDate) : null,
        }))
        .filter(({ startDate }) => startDate && startDate.getTime() >= now.getTime())
        .sort((a, b) => (a.startDate!.getTime() - b.startDate!.getTime()));

      const nextWrapper = eventsWithStart[0];
      if (!nextWrapper) {
        setCalendarLookupMessage(null);
        setCalendarLastEvent(null);
        setCalendarLookupError('Ingen kommende møder de næste 48 timer.');
        return;
      }

      const nextEvent = nextWrapper.event;
      const eventStartDate = nextWrapper.startDate ?? new Date();
      const eventSummary: CalendarEventSummary = {
        id: nextEvent.id,
        title: nextEvent.title?.trim() || 'Ukendt aftale',
        startDate: eventStartDate,
        location: nextEvent.location,
      };
      setCalendarLastEvent(eventSummary);

      const candidateTexts = [nextEvent.location, nextEvent.notes, nextEvent.title].filter(
        (value): value is string => !!value && value.trim().length > 0,
      );

      for (const text of candidateTexts) {
        const match = extractRoomFromText(text);
        if (match) {
          applySearchResult(match.buildingKey, match.result);
          const formattedTime = eventStartDate.toLocaleString('da-DK', {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          setCalendarLookupMessage(
            `Viser lokale fra kalenderaftalen "${eventSummary.title}" (${formattedTime}).`,
          );
          setCalendarLookupError(null);
          return;
        }
      }

      const formattedTime = eventStartDate.toLocaleString('da-DK', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      setCalendarLookupMessage(
        `Næste aftale "${eventSummary.title}" (${formattedTime}), men ingen lokale-information fundet.`,
      );
      setCalendarLookupError('Tilføj lokalenummer i kalenderaftalen for at finde det automatisk.');
    } catch (error) {
      console.warn('Calendar lookup failed', error);
      setCalendarLookupMessage(null);
      setCalendarLookupError('Noget gik galt under opslag i kalenderen.');
    } finally {
      setCalendarLookupLoading(false);
    }
  }, [applySearchResult, ensureCalendarAccess, extractRoomFromText]);

  const handleToggleCalendarSync = useCallback(
    async (value: boolean) => {
      setCalendarSyncEnabled(value);
      if (!value) {
        setCalendarLookupMessage(null);
        setCalendarLookupError(null);
        setCalendarLastEvent(null);
        return;
      }

      const granted = await ensureCalendarAccess();
      if (!granted) {
        setCalendarSyncEnabled(false);
      }
    },
    [ensureCalendarAccess],
  );

  const handleSelectBuilding = useCallback((key: string) => {
    setSelectedBuildingKey(key);
    setSearchQuery('');
    setErrorMessage(null);
    setQuickLookupError(null);

    const building = payload.buildings[key] as BuildingData | undefined;
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
  }, [payload]);

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

  useEffect(() => {
    if (__DEV__) {
      const sample = extractRoomFromText('Kalender: møde i lokale S10 (SP)');
      if (!sample) {
        console.warn('Dev check: eksempeltekst kunne ikke kortlægges til et lokale.');
      }
      const candidateProbe = createCandidatesFromLocation('solbjerg', 's14', 's14 PA', 'SP');
      if (!candidateProbe.includes('SPS14')) {
        console.warn('Dev check: forventet kandidat SPS14 mangler i createCandidatesFromLocation.');
      }
    }
  }, [extractRoomFromText]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.keyboardAvoider}
          enabled={activeTab === 'home'}
        >
          {activeTab === 'home' ? (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.content}>
                <View style={styles.header}>
                  {selectedBuilding ? (
                    <Pressable onPress={handleBack} style={styles.backButton} accessibilityRole="button">
                      <Text style={styles.backLabel}>← Tilbage</Text>
                    </Pressable>
                  ) : (
                    <Text style={[styles.title, styles.titleAccent]}>WayInn™</Text>
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
                      <View style={styles.quickLookupActions}>
                        <Pressable style={styles.quickLookupButton} onPress={handleQuickLookup}>
                          <Text style={styles.quickLookupButtonLabel}>Find lokale</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={calendarLookupLoading}
                          onPress={handleCalendarLookup}
                          style={({ pressed }) => [
                            styles.quickLookupCalendarButton,
                            calendarLookupLoading ? styles.quickLookupCalendarButtonDisabled : null,
                            pressed && !calendarLookupLoading
                              ? styles.quickLookupCalendarButtonPressed
                              : null,
                          ]}
                        >
                          {calendarLookupLoading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <Ionicons name="calendar-outline" size={16} color="#ffffff" />
                          )}
                          <Text style={styles.quickLookupCalendarButtonLabel}>
                            {calendarPermissionStatus === 'granted'
                              ? 'Brug næste møde'
                              : 'Tillad kalender'}
                          </Text>
                        </Pressable>
                      </View>
                      {quickLookupError ? <Text style={styles.error}>{quickLookupError}</Text> : null}
                      {calendarLookupError ? <Text style={styles.error}>{calendarLookupError}</Text> : null}
                      {calendarLookupMessage ? (
                        <Text style={styles.quickLookupHint}>{calendarLookupMessage}</Text>
                      ) : null}
                      {calendarLastEvent && calendarLastEventSummary ? (
                        <Text style={styles.quickLookupHint}>
                          Seneste kalenderaftale: {calendarLastEvent.title} ({calendarLastEventSummary})
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.buildingPickerSection}>
                      <BuildingPicker
                        buildings={buildingEntries.map((entry: BuildingEntry) => ({
                          key: entry.key,
                          name: entry.name,
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
          ) : activeTab === 'institutions' ? (
            <ScrollView contentContainerStyle={styles.sectionContent}>
              <View style={styles.institutionSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitleLarge}>Skift institution</Text>
                  <Text style={styles.sectionSubtitleMuted}>
                    Vælg hvilken organisation du vil se lokaler for. Mock-data for Novo Nordisk og andre er klar
                    til test.
                  </Text>
                </View>
                <View style={styles.institutionList}>
                  {institutionOptions.map((institution) => {
                    const isActive = selectedInstitution?.id === institution.id;
                    return (
                      <Pressable
                        key={institution.id}
                        accessibilityRole="button"
                        onPress={() => setSelectedInstitutionId(institution.id)}
                        style={({ pressed }) => [
                          styles.institutionCard,
                          isActive ? styles.institutionCardActive : null,
                          pressed ? styles.institutionCardPressed : null,
                        ]}
                      >
                        <View style={styles.institutionCardContent}>
                          <View style={styles.institutionText}>
                            <Text style={styles.institutionName}>{institution.name}</Text>
                            <Text style={styles.institutionMeta}>
                              {institution.organization} • {institution.region}
                            </Text>
                            <View style={styles.institutionBadges}>
                              {institution.campuses.map((campus) => (
                                <View key={campus} style={styles.institutionBadge}>
                                  <Text style={styles.institutionBadgeText}>{campus}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                          <Ionicons
                            name={isActive ? 'checkmark-circle' : 'business-outline'}
                            size={22}
                            color={isActive ? '#2563eb' : '#94a3b8'}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {selectedInstitution ? (
                  <View style={styles.institutionDetails}>
                    <Text style={styles.institutionDetailsTitle}>Aktiv institution</Text>
                    <Text style={styles.institutionDetailsName}>{selectedInstitution.name}</Text>
                    <Text style={styles.institutionDetailsDescription}>
                      {selectedInstitution.organization} • {selectedInstitution.region}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.institutionAction}
                      onPress={() => {
                        handleBack();
                        setActiveTab('home');
                      }}
                    >
                      <Ionicons name="navigate-outline" size={18} color="#ffffff" />
                      <Text style={styles.institutionActionLabel}>
                        Skift til {selectedInstitution.name}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.sectionContent}>
              <View style={styles.settingsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitleLarge}>Indstillinger</Text>
                  <Text style={styles.sectionSubtitleMuted}>
                    Tilpas WayInn-oplevelsen. Indstillingerne er mock-data og bliver ikke gemt endnu.
                  </Text>
                </View>
                <View style={styles.settingsCard}>
                  <View style={styles.settingsRow}>
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsOption}>Notifikationer</Text>
                      <Text style={styles.settingsDescription}>
                        Få besked når lokaler flyttes eller ændres.
                      </Text>
                    </View>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={notificationsEnabled ? '#2563eb' : '#f1f5f9'}
                    />
                  </View>
                  <View style={styles.settingsDivider} />
                  <View style={styles.settingsRow}>
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsOption}>Kalender-sync</Text>
                      <Text style={styles.settingsDescription}>
                        Synkronisér møder fra din kalender automatisk.
                      </Text>
                    </View>
                    <Switch
                      value={calendarSyncEnabled}
                      onValueChange={async (value) => {
                        try {
                          await handleToggleCalendarSync(value);
                        } catch (error) {
                          console.warn('Kalender-sync toggle mislykkedes', error);
                        }
                      }}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={calendarSyncEnabled ? '#2563eb' : '#f1f5f9'}
                    />
                  </View>
                  <View style={styles.settingsDivider} />
                  <View style={styles.settingsRow}>
                    <View style={styles.settingsRowText}>
                      <Text style={styles.settingsOption}>Mørkt tema</Text>
                      <Text style={styles.settingsDescription}>
                        Reducér lysstyrke og gør kortene mørke.
                      </Text>
                    </View>
                    <Switch
                      value={darkModeEnabled}
                      onValueChange={setDarkModeEnabled}
                      trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                      thumbColor={darkModeEnabled ? '#2563eb' : '#f1f5f9'}
                    />
                  </View>
                </View>
                <View style={styles.settingsInfo}>
                  <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
                  <Text style={styles.settingsInfoText}>
                    Flere indstillinger er på vej – giv besked hvis du har ønsker til funktioner.
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('home')}
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === 'home' ? styles.tabButtonActive : null,
              pressed ? styles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? '#2563eb' : '#94a3b8'}
            />
            <Text style={[styles.tabLabel, activeTab === 'home' ? styles.tabLabelActive : null]}>Hjem</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('institutions')}
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === 'institutions' ? styles.tabButtonActive : null,
              pressed ? styles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'institutions' ? 'business' : 'business-outline'}
              size={22}
              color={activeTab === 'institutions' ? '#2563eb' : '#94a3b8'}
            />
            <Text
              style={[styles.tabLabel, activeTab === 'institutions' ? styles.tabLabelActive : null]}
            >
              Institutioner
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('settings')}
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === 'settings' ? styles.tabButtonActive : null,
              pressed ? styles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={22}
              color={activeTab === 'settings' ? '#2563eb' : '#94a3b8'}
            />
            <Text style={[styles.tabLabel, activeTab === 'settings' ? styles.tabLabelActive : null]}>
              Indstillinger
            </Text>
          </Pressable>
        </View>
      </View>
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
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 160,
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
  titleAccent: {
    color: '#1d4ed8',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
  },
  landing: {
    gap: 28,
  },
  sectionContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 160,
    gap: 24,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitleLarge: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubtitleMuted: {
    color: '#64748b',
    lineHeight: 20,
  },
  institutionSection: {
    gap: 24,
  },
  institutionList: {
    gap: 12,
  },
  institutionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  institutionCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  institutionCardPressed: {
    opacity: 0.9,
  },
  institutionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  institutionText: {
    flex: 1,
    gap: 8,
  },
  institutionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  institutionMeta: {
    color: '#475467',
  },
  institutionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  institutionBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  institutionBadgeText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  institutionDetails: {
    gap: 12,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#0f172a',
  },
  institutionDetailsTitle: {
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '700',
  },
  institutionDetailsName: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  institutionDetailsDescription: {
    color: '#e2e8f0',
  },
  institutionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  institutionActionLabel: {
    color: '#ffffff',
    fontWeight: '600',
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
  quickLookupActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  quickLookupCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickLookupCalendarButtonDisabled: {
    opacity: 0.7,
  },
  quickLookupCalendarButtonPressed: {
    opacity: 0.85,
  },
  quickLookupCalendarButtonLabel: {
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
  settingsSection: {
    gap: 24,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingsRowText: {
    flex: 1,
    gap: 4,
  },
  settingsOption: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  settingsDescription: {
    color: '#64748b',
    lineHeight: 18,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },
  settingsInfo: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 16,
  },
  settingsInfoText: {
    flex: 1,
    color: '#0f172a',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.select({ ios: 24, default: 16 }),
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#e0f2fe',
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#2563eb',
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
