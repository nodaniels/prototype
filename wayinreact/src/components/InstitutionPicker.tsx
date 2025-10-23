import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InstitutionOption } from '../constants';
import { styles } from '../styles/InstitutionPicker.styles';

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