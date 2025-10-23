import { Platform, StyleSheet } from 'react-native';

export const appStyles = StyleSheet.create({
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
  buildingPickerSection: {
    gap: 12,
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
});
