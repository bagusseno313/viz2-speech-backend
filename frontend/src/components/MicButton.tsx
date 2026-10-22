import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  style?: ViewStyle;
}

/**
 * The gold circular microphone from the Result and VQA frames — a solid
 * #FFAE00 disc with a white microphone glyph. In the design it is 110px on the
 * Result screen and 155px on the VQA listening screen. It is purely visual
 * feedback (capture / questions are gesture-driven) so it is hidden from the
 * accessibility tree.
 */
export function MicButton({ size = 110, style }: Props) {
  return (
    <View
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <MaterialCommunityIcons name="microphone" size={size * 0.56} color={colors.textOnDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.micGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
