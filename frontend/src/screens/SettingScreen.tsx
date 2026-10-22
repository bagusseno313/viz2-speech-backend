import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { SETTINGS_ITEMS } from '../data/content';
import { TopBar } from '../components/TopBar';
import { TapToGoBack } from '../components/TapToGoBack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Setting'>;

/** Settings list — mirrors the Figma "Setting" frame (display only). */
export function SettingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <TapToGoBack
      onBack={() => navigation.goBack()}
      style={[styles.screen, { paddingTop: insets.top }]}
      accessibilityLabel="Pengaturan">
      <StatusBar style="dark" />
      <TopBar
        onPressSettings={() => {}}
        onPressHelp={() => navigation.navigate('Help')}
      />

      <View style={[styles.panel, { marginBottom: insets.bottom + 5 }]}>
        <Text style={styles.title}>Settings</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {SETTINGS_ITEMS.map((item, i) => (
            <View
              key={`${item.label}-${i}`}
              style={styles.row}
              accessibilityRole="text"
              accessibilityLabel={item.label}>
              <MaterialIcons
                name={item.icon as any}
                size={26}
                color={colors.iconGold}
                style={styles.rowIcon}
              />
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </TapToGoBack>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  panel: {
    flex: 1,
    marginHorizontal: 15,
    marginTop: 6,
    backgroundColor: colors.panel,
    borderRadius: 10,
    paddingTop: 22,
  },
  title: {
    color: colors.textOnDark,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  list: { paddingLeft: 25, paddingRight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  rowIcon: { width: 30 },
  rowLabel: {
    color: colors.textOnDark,
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginLeft: 16,
  },
});
