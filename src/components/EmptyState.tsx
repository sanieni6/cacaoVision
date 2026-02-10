import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CACAO_COLORS } from '../constants/colors';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export default function EmptyState({
  title = 'Sin modelo cargado',
  subtitle = 'Importa un modelo ONNX para comenzar a detectar enfermedades en mazorcas de cacao',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="leaf-outline" size={48} color={CACAO_COLORS.primaryLight} />
        <View style={styles.searchIcon}>
          <Ionicons name="search" size={24} color={CACAO_COLORS.accent} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CACAO_COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: CACAO_COLORS.surface,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: CACAO_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: CACAO_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
