import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingsPanelProps {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  calendarSyncEnabled: boolean;
  onToggleCalendarSync: (value: boolean) => Promise<void>;
  darkModeEnabled: boolean;
  setDarkModeEnabled: (enabled: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  notificationsEnabled,
  setNotificationsEnabled,
  calendarSyncEnabled,
  onToggleCalendarSync,
  darkModeEnabled,
  setDarkModeEnabled,
}) => {
  return (
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
                  await onToggleCalendarSync(value);
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
  );
};

const styles = StyleSheet.create({
  sectionContent: {
    padding: 24,
  },
  settingsSection: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitleLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionSubtitleMuted: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsRowText: {
    flex: 1,
    marginRight: 12,
  },
  settingsOption: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  settingsDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  settingsInfo: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  settingsInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
