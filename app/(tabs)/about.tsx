import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CACAO_COLORS } from '../../src/constants/colors';

export default function AboutScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* App header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={48} color={CACAO_COLORS.textOnPrimary} />
        </View>
        <Text style={styles.appName}>CacaoVision</Text>
        <Text style={styles.version}>Versión 1.0.0</Text>
      </View>

      <View style={styles.divider} />

      {/* About the project */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre el Proyecto</Text>
        <Text style={styles.sectionSubtitle}>
          TFM - Detección de Enfermedades en Cacao mediante Visión por Computadora
        </Text>
        <Text style={styles.description}>
          Aplicación móvil que utiliza modelos YOLO entrenados para detectar
          enfermedades en mazorcas de cacao a partir de fotografías. La inferencia
          se ejecuta completamente en el dispositivo, sin necesidad de conexión
          a internet.
        </Text>
      </View>

      {/* Author */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Autor</Text>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={18} color={CACAO_COLORS.primaryLight} />
          <Text style={styles.infoText}>Luis Sánchez</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={18} color={CACAO_COLORS.primaryLight} />
          <Text style={styles.infoText}>2025</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="school" size={18} color={CACAO_COLORS.primaryLight} />
          <Text style={styles.infoText}>
            Universidad Internacional de Valencia (VIU)
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="ribbon" size={18} color={CACAO_COLORS.primaryLight} />
          <Text style={styles.infoText}>
            Máster en Inteligencia Artificial
          </Text>
        </View>
      </View>

      {/* Technologies */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tecnologías</Text>
        <View style={styles.chipContainer}>
          {[
            'Expo',
            'React Native',
            'ONNX Runtime',
            'YOLO',
            'TypeScript',
          ].map((tech) => (
            <View key={tech} style={styles.chip}>
              <Text style={styles.chipText}>{tech}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Source code */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Código Fuente</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() =>
            Linking.openURL('https://github.com/luissanchez/cacaovision')
          }
        >
          <Ionicons name="logo-github" size={20} color={CACAO_COLORS.primary} />
          <Text style={styles.linkText}>GitHub Repository</Text>
          <Ionicons
            name="open-outline"
            size={16}
            color={CACAO_COLORS.primaryLight}
          />
        </TouchableOpacity>
        <View style={styles.licenseBadge}>
          <Ionicons name="document-text" size={16} color={CACAO_COLORS.secondary} />
          <Text style={styles.licenseText}>MIT License</Text>
        </View>
      </View>

      {/* Supported models */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modelos Soportados</Text>

        <View style={styles.modelCard}>
          <Text style={styles.modelName}>YOLO26n</Text>
          <Text style={styles.modelDetail}>9.35 MB | Detección end-to-end</Text>
          <Text style={styles.modelDetail}>NMS integrado en el modelo</Text>
        </View>

        <View style={styles.modelCard}>
          <Text style={styles.modelName}>YOLO11n</Text>
          <Text style={styles.modelDetail}>10.11 MB | Requiere NMS en app</Text>
          <Text style={styles.modelDetail}>Post-procesamiento en JavaScript</Text>
        </View>

        <View style={styles.classesContainer}>
          <Text style={styles.classesTitle}>3 Clases de Detección:</Text>
          <View style={styles.classRow}>
            <View style={[styles.classColor, { backgroundColor: '#2ECC71' }]} />
            <Text style={styles.classText}>Saludable</Text>
          </View>
          <View style={styles.classRow}>
            <View style={[styles.classColor, { backgroundColor: '#F39C12' }]} />
            <Text style={styles.classText}>Moniliasis</Text>
          </View>
          <View style={styles.classRow}>
            <View style={[styles.classColor, { backgroundColor: '#E74C3C' }]} />
            <Text style={styles.classText}>Mazorca Negra</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          CacaoVision 2025 - Todos los derechos reservados
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CACAO_COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: CACAO_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: CACAO_COLORS.text,
  },
  version: {
    fontSize: 14,
    color: CACAO_COLORS.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: CACAO_COLORS.surfaceVariant,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: CACAO_COLORS.text,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CACAO_COLORS.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: CACAO_COLORS.textSecondary,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 14,
    color: CACAO_COLORS.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: CACAO_COLORS.primary + '18',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CACAO_COLORS.primary + '30',
  },
  chipText: {
    fontSize: 13,
    color: CACAO_COLORS.primary,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CACAO_COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: CACAO_COLORS.primary,
    fontWeight: '500',
  },
  licenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  licenseText: {
    fontSize: 13,
    color: CACAO_COLORS.secondary,
    fontWeight: '500',
  },
  modelCard: {
    backgroundColor: CACAO_COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '700',
    color: CACAO_COLORS.primary,
    marginBottom: 4,
  },
  modelDetail: {
    fontSize: 13,
    color: CACAO_COLORS.textSecondary,
    marginTop: 2,
  },
  classesContainer: {
    backgroundColor: CACAO_COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  classesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CACAO_COLORS.text,
    marginBottom: 10,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  classColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  classText: {
    fontSize: 14,
    color: CACAO_COLORS.text,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 12,
    color: CACAO_COLORS.textSecondary,
  },
});
