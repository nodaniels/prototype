import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PermissionState } from '../constants';

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

const styles = StyleSheet.create({
  quickLookupCard: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  quickLookupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickLookupTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#0f172a',
  },
  quickLookupInfoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLookupInfoLabel: {
    fontWeight: '700',
    fontSize: 14,
    color: '#64748b',
  },
  quickLookupInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 72,
    marginBottom: 12,
  },
  quickLookupActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickLookupButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLookupButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickLookupCalendarButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLookupCalendarButtonDisabled: {
    opacity: 0.6,
  },
  quickLookupCalendarButtonPressed: {
    opacity: 0.85,
  },
  quickLookupCalendarButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  quickLookupHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  error: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475467',
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
