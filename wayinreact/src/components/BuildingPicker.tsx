/**
 * BuildingPicker - Visning af bygningsvalgsmuligheder
 * 
 * Simpel liste af bygninger som brugeren kan vælge imellem.
 * Viser bygningsnavn og eventuel beskrivelse.
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles/BuildingPicker.styles';

/** En bygning der kan vælges */
interface BuildingOption {
  key: string; // Unik ID for bygningen
  name: string; // Visningsnavn
  description?: string; // Valgfri beskrivelse
}

/** Props for BuildingPicker komponenten */
interface BuildingPickerProps {
  buildings: BuildingOption[]; // Liste af tilgængelige bygninger
  onSelect: (buildingKey: string) => void; // Callback når bygning vælges
}

/**
 * Komponent der viser liste af bygninger
 * Brugeren kan trykke på en bygning for at vælge den
 */
export const BuildingPicker: React.FC<BuildingPickerProps> = ({ buildings, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vælg bygning</Text>
      <View style={styles.list}>
        {buildings.map((item) => (
          <Pressable key={item.key} style={styles.card} onPress={() => onSelect(item.key)}>
            <Text style={styles.title}>{item.name}</Text>
            {item.description ? <Text style={styles.subtitle}>{item.description}</Text> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
};