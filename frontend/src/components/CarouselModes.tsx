import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ModeCard } from './ModeCard';
import { modeAt, wrapIndex } from '../data/modes';
import { colors } from '../theme/colors';

interface Props {
  /** Index of the active (centered) mode in the MODES array. */
  activeIndex: number;
  onSelectMode?: (nextIndex: number) => void;
}

/**
 * The bottom mode carousel — the Figma "Carousel Mode" component. It shows
 * three cards (previous · active · next) centered in a 150px-tall white strip,
 * with a 15px gap between cards. The list is circular so there is always a card
 * on each side. The inactive side cards are tappable so a user can jump to a
 * different mode without relying only on swipes.
 */
export function CarouselModes({ activeIndex, onSelectMode }: Props) {
  const previousIndex = wrapIndex(activeIndex - 1);
  const nextIndex = wrapIndex(activeIndex + 1);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ModeButton
          mode={modeAt(previousIndex)}
          onPress={onSelectMode ? () => onSelectMode(previousIndex) : undefined}
        />
        <ModeCard mode={modeAt(activeIndex)} active />
        <ModeButton
          mode={modeAt(nextIndex)}
          onPress={onSelectMode ? () => onSelectMode(nextIndex) : undefined}
        />
      </View>
    </View>
  );
}

function ModeButton({
  mode,
  onPress,
}: {
  mode: ReturnType<typeof modeAt>;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Pilih mode ${mode.label}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.cardButton}>
      <ModeCard mode={mode} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  cardButton: {
    borderRadius: 16,
  },
});
