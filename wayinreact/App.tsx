import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';

import type {
  BuildingData,
  BuildingEntry,
  CalendarEventSummary,
  DisplayedFloor,
  SearchResult,
} from './src/types';
import { INSTITUTION_OPTIONS, type TabKey } from './src/constants';
import { BuildingPicker } from './src/components/BuildingPicker';
import { QuickLookupCard } from './src/components/QuickLookupCard';
import { SearchSection } from './src/components/SearchSection';
import { InstitutionPicker } from './src/components/InstitutionPicker';
import { SettingsPanel } from './src/components/SettingsPanel';
import { useRemoteBuildings } from './src/hooks/useRemoteBuildings';
import { useCalendarPermissions } from './src/hooks/useCalendarPermissions';
import { listRoomIds, searchRoomInBuilding } from './src/utils/search';
import { extractRoomFromText, isGroundFloor } from './src/utils/buildingSearch';
import { appStyles } from './src/styles/AppStyles';

const App: React.FC = () => {
  // State
  const [selectedBuildingKey, setSelectedBuildingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedFloor, setDisplayedFloor] = useState<DisplayedFloor | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickLookupValue, setQuickLookupValue] = useState('');
  const [quickLookupError, setQuickLookupError] = useState<string | null>(null);
  const [quickLookupInfoVisible, setQuickLookupInfoVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [calendarLookupLoading, setCalendarLookupLoading] = useState(false);
  const [calendarLookupMessage, setCalendarLookupMessage] = useState<string | null>(null);
  const [calendarLastEvent, setCalendarLastEvent] = useState<CalendarEventSummary | null>(null);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(
    () => INSTITUTION_OPTIONS[0]?.id ?? null,
  );

  // Hooks
  const { payload } = useRemoteBuildings();
  const {
    calendarPermissionStatus,
    calendarLookupError,
    setCalendarLookupError,
    ensureCalendarAccess,
  } = useCalendarPermissions();

  // Computed values
  const selectedInstitution = useMemo(() => {
    return (
      INSTITUTION_OPTIONS.find((option) => option.id === selectedInstitutionId) ??
      INSTITUTION_OPTIONS[0] ??
      null
    );
  }, [selectedInstitutionId]);

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

  // Handlers
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

    const match = extractRoomFromText(quickLookupValue, payload.buildings);
    if (!match) {
      setQuickLookupError('Kunne ikke finde lokalet. Tjek at nummeret er korrekt.');
      return;
    }

    setQuickLookupError(null);
    applySearchResult(match.buildingKey, match.result);
  }, [applySearchResult, quickLookupValue, payload.buildings]);

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
        .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

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
        const match = extractRoomFromText(text, payload.buildings);
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
  }, [applySearchResult, ensureCalendarAccess, payload.buildings, setCalendarLookupError]);

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
    [ensureCalendarAccess, setCalendarLookupError],
  );

  const handleSelectBuilding = useCallback(
    (key: string) => {
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
    },
    [payload],
  );

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

    const globalMatch = extractRoomFromText(trimmedQuery, payload.buildings);
    if (!globalMatch) {
      setErrorMessage(
        'Kunne ikke finde lokalet. Vælg en bygning eller indsæt et gyldigt lokalenummer.',
      );
      return;
    }

    applySearchResult(globalMatch.buildingKey, globalMatch.result);
  }, [applySearchResult, searchQuery, selectedBuilding, selectedBuildingKey, payload.buildings]);

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

  const handleNavigateToInstitution = useCallback(() => {
    handleBack();
    setActiveTab('home');
  }, [handleBack]);

  return (
    <SafeAreaView style={appStyles.safeArea}>
      <StatusBar style="dark" />
      <View style={appStyles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={appStyles.keyboardAvoider}
          enabled={activeTab === 'home'}
        >
          {activeTab === 'home' ? (
            <ScrollView
              contentContainerStyle={appStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={appStyles.content}>
                <View style={appStyles.header}>
                  {selectedBuilding ? (
                    <Pressable
                      onPress={handleBack}
                      style={appStyles.backButton}
                      accessibilityRole="button"
                    >
                      <Text style={appStyles.backLabel}>← Tilbage</Text>
                    </Pressable>
                  ) : (
                    <Text style={[appStyles.title, appStyles.titleAccent]}>WayInn™</Text>
                  )}
                </View>

                {!selectedBuilding ? (
                  <View style={appStyles.landing}>
                    <QuickLookupCard
                      quickLookupValue={quickLookupValue}
                      setQuickLookupValue={setQuickLookupValue}
                      quickLookupError={quickLookupError}
                      setQuickLookupError={setQuickLookupError}
                      quickLookupInfoVisible={quickLookupInfoVisible}
                      setQuickLookupInfoVisible={setQuickLookupInfoVisible}
                      calendarLookupLoading={calendarLookupLoading}
                      calendarLookupError={calendarLookupError}
                      calendarLookupMessage={calendarLookupMessage}
                      calendarLastEvent={calendarLastEvent}
                      calendarLastEventSummary={calendarLastEventSummary}
                      calendarPermissionStatus={calendarPermissionStatus}
                      onQuickLookup={handleQuickLookup}
                      onCalendarLookup={handleCalendarLookup}
                    />

                    <View style={appStyles.buildingPickerSection}>
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
                  <SearchSection
                    selectedBuilding={selectedBuilding}
                    selectedBuildingKey={selectedBuildingKey!}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    errorMessage={errorMessage}
                    displayedFloor={displayedFloor}
                    roomSuggestions={roomSuggestions}
                    onSearch={handleSearch}
                    onSuggestionPress={handleSuggestionPress}
                  />
                )}
              </View>
            </ScrollView>
          ) : activeTab === 'institutions' ? (
            <InstitutionPicker
              institutionOptions={INSTITUTION_OPTIONS}
              selectedInstitution={selectedInstitution}
              onSelectInstitution={setSelectedInstitutionId}
              onNavigateToInstitution={handleNavigateToInstitution}
            />
          ) : (
            <SettingsPanel
              notificationsEnabled={false}
              setNotificationsEnabled={() => {}}
              calendarSyncEnabled={calendarSyncEnabled}
              onToggleCalendarSync={handleToggleCalendarSync}
              darkModeEnabled={false}
              setDarkModeEnabled={() => {}}
            />
          )}
        </KeyboardAvoidingView>
        <View style={appStyles.tabBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('home')}
            style={({ pressed }) => [
              appStyles.tabButton,
              activeTab === 'home' ? appStyles.tabButtonActive : null,
              pressed ? appStyles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? '#2563eb' : '#94a3b8'}
            />
            <Text
              style={[
                appStyles.tabLabel,
                activeTab === 'home' ? appStyles.tabLabelActive : null,
              ]}
            >
              Hjem
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('institutions')}
            style={({ pressed }) => [
              appStyles.tabButton,
              activeTab === 'institutions' ? appStyles.tabButtonActive : null,
              pressed ? appStyles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'institutions' ? 'business' : 'business-outline'}
              size={22}
              color={activeTab === 'institutions' ? '#2563eb' : '#94a3b8'}
            />
            <Text
              style={[
                appStyles.tabLabel,
                activeTab === 'institutions' ? appStyles.tabLabelActive : null,
              ]}
            >
              Institutioner
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveTab('settings')}
            style={({ pressed }) => [
              appStyles.tabButton,
              activeTab === 'settings' ? appStyles.tabButtonActive : null,
              pressed ? appStyles.tabButtonPressed : null,
            ]}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
              size={22}
              color={activeTab === 'settings' ? '#2563eb' : '#94a3b8'}
            />
            <Text
              style={[
                appStyles.tabLabel,
                activeTab === 'settings' ? appStyles.tabLabelActive : null,
              ]}
            >
              Indstillinger
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default App;
