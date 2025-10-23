import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InstitutionOption } from '../constants';

interface InstitutionPickerProps {
  institutionOptions: InstitutionOption[];
  selectedInstitution: InstitutionOption | null;
  onSelectInstitution: (id: string) => void;
  onNavigateToInstitution: () => void;
}

export const InstitutionPicker: React.FC<InstitutionPickerProps> = ({
  institutionOptions,
  selectedInstitution,
  onSelectInstitution,
  onNavigateToInstitution,
}) => {
  return (
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
                onPress={() => onSelectInstitution(institution.id)}
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
              onPress={onNavigateToInstitution}
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
  );
};

const styles = StyleSheet.create({
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
