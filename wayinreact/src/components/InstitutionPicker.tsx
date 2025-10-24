/**
 * InstitutionPicker - Vælger institution/organisation
 * 
 * Giver brugeren mulighed for at skifte mellem forskellige institutioner
 * (f.eks. CBS, Novo Nordisk). Viser aktiv institution og tilgængelige campus.
 */

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { InstitutionOption } from '../constants';
import { styles } from '../styles/InstitutionPicker.styles';

/** Props for InstitutionPicker komponenten */
interface InstitutionPickerProps {
  institutionOptions: InstitutionOption[]; // Liste af tilgængelige institutioner
  selectedInstitution: InstitutionOption | null; // Aktuel valgt institution
  onSelectInstitution: (id: string) => void; // Vælg institution
  onNavigateToInstitution: () => void; // Naviger til valgt institution
}

/**
 * Komponent til valg af institution
 * Viser liste af tilgængelige organisationer med campus og region
 */
export const InstitutionPicker: React.FC<InstitutionPickerProps> = ({
  institutionOptions,
  selectedInstitution,
  onSelectInstitution,
  onNavigateToInstitution,
}) => {
  return (
    <ScrollView contentContainerStyle={styles.sectionContent}>
      <View style={styles.institutionSection}>
        {/* Header med forklaring */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleLarge}>Skift institution</Text>
          <Text style={styles.sectionSubtitleMuted}>
            Vælg hvilken organisation du vil se lokaler for. Mock-data for Novo Nordisk og andre er klar
            til test.
          </Text>
        </View>
        
        {/* Liste af institutioner */}
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
                    {/* Institution navn */}
                    <Text style={styles.institutionName}>{institution.name}</Text>
                    {/* Organisation og region */}
                    <Text style={styles.institutionMeta}>
                      {institution.organization} • {institution.region}
                    </Text>
                    {/* Campus badges */}
                    <View style={styles.institutionBadges}>
                      {institution.campuses.map((campus) => (
                        <View key={campus} style={styles.institutionBadge}>
                          <Text style={styles.institutionBadgeText}>{campus}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  {/* Ikon der viser om institution er aktiv */}
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
        
        {/* Detaljer om aktiv institution */}
        {selectedInstitution ? (
          <View style={styles.institutionDetails}>
            <Text style={styles.institutionDetailsTitle}>Aktiv institution</Text>
            <Text style={styles.institutionDetailsName}>{selectedInstitution.name}</Text>
            <Text style={styles.institutionDetailsDescription}>
              {selectedInstitution.organization} • {selectedInstitution.region}
            </Text>
            {/* Knap til at skifte til institution */}
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