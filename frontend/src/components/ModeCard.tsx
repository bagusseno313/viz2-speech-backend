import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { Mode } from '../data/modes';

interface Props {
  mode: Mode;
  active?: boolean;
}

/**
 * A single carousel card, exact to the Figma "Carousel Mode" component.
 *   - active:   116 × 138, magenta (#D22D80), white icon + white label
 *   - inactive:  96 × 114, white, mode-coloured icon + black label
 * Both have a 16px radius, the icon stacked above the label with a 10px gap,
 * and the label rendered uppercase in Inter ExtraBold.
 */
export function ModeCard({ mode, active = false }: Props) {
  return (
    <View style={[styles.card, active ? styles.cardActive : styles.cardInactive]}>
      <MaterialCommunityIcons
        name={mode.icon as any}
        size={active ? 36 : 28}
        color={active ? colors.textOnDark : mode.color}
      />
      <Text
        style={[styles.label, active ? styles.labelActive : styles.labelInactive]}
        numberOfLines={1}>
        {mode.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  cardActive: {
    width: 116,
    height: 138,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardInactive: {
    width: 96,
    height: 114,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  label: {
    fontFamily: fonts.extrabold,
    letterSpacing: 0.3,
  },
  labelActive: { color: colors.textOnDark, fontSize: 13 },
  labelInactive: { color: colors.cardLabel, fontSize: 12 },
});
