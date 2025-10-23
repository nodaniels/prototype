import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PermissionState } from '../constants';
import { styles } from '../styles/QuickLookupCard.styles';

interface QuickLookupCardProps {
  quickLookupValue: string;
  setQuickLookupValue: (value: string) => void;
  quickLookupError: string | null;
  setQuickLookupError: (error: string | null) => void;
  quickLookupInfoVisible: boolean;
  setQuickLookupInfoVisible: (visible: boolean) => void;
  calendarLookupLoading: boolean;
  calendarLookupError: string | null;
  calendarLookupMessage: string | null;
  calendarLastEvent: { id: string; title: string; startDate: Date; location?: string | null } | null;
  calendarLastEventSummary: string | null;
  calendarPermissionStatus: PermissionState;
  onQuickLookup: () => void;
  onCalendarLookup: () => void;
}

export const QuickLookupCard: React.FC<QuickLookupCardProps> = ({
  quickLookupValue,
  setQuickLookupValue,
  quickLookupError,
  setQuickLookupError,
  quickLookupInfoVisible,
  setQuickLookupInfoVisible,
  calendarLookupLoading,
  calendarLookupError,
  calendarLookupMessage,
  calendarLastEvent,
  calendarLastEventSummary,
  calendarPermissionStatus,
  onQuickLookup,
  onCalendarLookup,
}) => {
  return (
    <>
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
          placeholder='Fx "Statusmøde i S10" eller "Lokale R2.17, Solbjerg"'
          placeholderTextColor="#94a3b8"
          style={styles.quickLookupInput}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          onSubmitEditing={onQuickLookup}
          blurOnSubmit
        />
        <View style={styles.quickLookupActions}>
          <Pressable style={styles.quickLookupButton} onPress={onQuickLookup}>
            <Text style={styles.quickLookupButtonLabel}>Find lokale</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={calendarLookupLoading}
            onPress={onCalendarLookup}
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

      <Modal
        visible={quickLookupInfoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQuickLookupInfoVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setQuickLookupInfoVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Hvordan virker det?</Text>
            <Text style={styles.modalBody}>
              Kopier teksten fra din kalenderaftale og indsæt den her.{'\n\n'}
              WayInn scanner teksten efter lokale-information og viser den
              relevante etage med markeret lokale og nærmeste indgang.{'\n\n'}
              Eksempel: "Statusmøde i S10" → finder S10 i Solbjerg.
            </Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setQuickLookupInfoVisible(false)}
            >
              <Text style={styles.modalCloseButtonLabel}>Luk</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};