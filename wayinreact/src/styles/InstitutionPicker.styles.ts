import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  sectionContent: {
    padding: 24,
  },
  institutionSection: {
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
  institutionList: {
    gap: 12,
    marginBottom: 24,
  },
  institutionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  institutionCardActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  institutionCardPressed: {
    opacity: 0.85,
  },
  institutionCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  institutionText: {
    flex: 1,
    marginRight: 12,
  },
  institutionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  institutionMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  institutionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  institutionBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  institutionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475467',
  },
  institutionDetails: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  institutionDetailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  institutionDetailsName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  institutionDetailsDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  institutionAction: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  institutionActionLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
