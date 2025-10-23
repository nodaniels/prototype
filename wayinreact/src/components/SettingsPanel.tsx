import React from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/SettingsPanel.styles';

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