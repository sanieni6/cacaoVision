import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CACAO_COLORS } from '../constants/colors';

interface ImageSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

export default function ImageSourceSheet({
  visible,
  onClose,
  onCamera,
  onGallery,
}: ImageSourceSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <Text style={styles.title}>Seleccionar imagen</Text>

            <TouchableOpacity style={styles.option} onPress={onCamera}>
              <View style={styles.iconContainer}>
                <Ionicons name="camera" size={28} color={CACAO_COLORS.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Tomar Foto</Text>
                <Text style={styles.optionSubtitle}>Usar la cámara del dispositivo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={CACAO_COLORS.primaryLight} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={onGallery}>
              <View style={styles.iconContainer}>
                <Ionicons name="images" size={28} color={CACAO_COLORS.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Elegir de Galería</Text>
                <Text style={styles.optionSubtitle}>Seleccionar imagen existente</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={CACAO_COLORS.primaryLight} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CACAO_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: CACAO_COLORS.primaryLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: CACAO_COLORS.text,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: CACAO_COLORS.surface,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: CACAO_COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: CACAO_COLORS.text,
  },
  optionSubtitle: {
    fontSize: 13,
    color: CACAO_COLORS.textSecondary,
    marginTop: 2,
  },
});
