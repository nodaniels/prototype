import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
