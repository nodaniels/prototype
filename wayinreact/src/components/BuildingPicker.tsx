import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#101828',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#020617',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
  },
});
