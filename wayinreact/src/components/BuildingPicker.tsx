import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles/BuildingPicker.styles';

interface BuildingOption {
  key: string;
  name: string;
  description?: string;
}

interface BuildingPickerProps {
  buildings: BuildingOption[];
  onSelect: (buildingKey: string) => void;
}

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