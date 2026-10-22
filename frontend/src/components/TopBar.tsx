import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { VoiceButton } from './VoiceButton';

interface Props {
  onPressSettings: () => void;
  onPressHelp: () => void;
}

/**
 * The "Menu" row from the Figma frames: a gear (settings) on the left and a
 * question-mark (help) on the right, each a gold glyph on a light-grey circular
 * chip. Both chips are VoiceButtons: a single tap speaks the label ("Pengaturan"
 * / "Bantuan") and a double tap opens the screen.
 */
export function TopBar({ onPressSettings, onPressHelp }: Props) {
  return (
    <View style={styles.row}>
      <VoiceButton
        style={styles.chip}
        label="Pengaturan"
        onActivate={onPressSettings}
        hitSlop={12}>
        <MaterialCommunityIcons name="cog" size={20} color={colors.iconGold} />
      </VoiceButton>

      <VoiceButton
        style={styles.chip}
        label="Bantuan"
        onActivate={onPressHelp}
        hitSlop={12}>
        <MaterialCommunityIcons name="help" size={18} color={colors.iconGold} />
      </VoiceButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
