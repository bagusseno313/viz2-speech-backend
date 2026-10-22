import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { speak } from '../services/speech';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Entry'>;

/**
 * Splash / branding screen (Figma "Entry"): the eye-and-soundwave logo above the
 * "Viz2Speech" wordmark, centered on a white screen. Greets the user aloud, then
 * advances to the camera.
 */
export function EntryScreen({ navigation }: Props) {
  useEffect(() => {
    speak('Selamat datang di Viz2Speech');
    const t = setTimeout(() => navigation.replace('Camera'), 2200);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.container} accessibilityLabel="Viz2Speech. Selamat datang.">
      <StatusBar style="dark" />
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Logo group is 225 × 159 in the design; keep that aspect ratio.
  logo: { width: 225, height: 159 },
});
