import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { HELP } from '../data/content';
import { speak } from '../services/speech';
import { TopBar } from '../components/TopBar';
import { TapToGoBack } from '../components/TapToGoBack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

/** Flatten the structured help content into one spoken paragraph. */
function buildHelpSpeech(): string {
  const parts: string[] = [HELP.title, HELP.intro, HELP.guideHeading];
  HELP.items.forEach((item) => {
    parts.push(`${item.title}. ${item.body}`);
    if ('sub' in item && item.sub) {
      item.sub.forEach((s) => parts.push(`${s.title}. ${s.body}`));
    }
  });
  return parts.join(' ');
}

/** Static help / onboarding content, verbatim from the Figma "Help" frame. */
export function HelpScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Read the whole guide aloud automatically as soon as the screen loads, so a
  // visually impaired user hears the instructions without any interaction.
  const speech = useMemo(buildHelpSpeech, []);
  useEffect(() => {
    speak(`Bantuan. ${speech}`);
  }, [speech]);

  return (
    <TapToGoBack
      onBack={() => navigation.goBack()}
      style={[styles.screen, { paddingTop: insets.top }]}
      accessibilityLabel="Bantuan">
      <StatusBar style="dark" />
      <TopBar
        onPressSettings={() => navigation.navigate('Setting')}
        onPressHelp={() => {}}
      />

      <View style={[styles.panel, { marginBottom: insets.bottom + 5 }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{HELP.title}</Text>
          <Text style={styles.intro}>{HELP.intro}</Text>

          <Text style={styles.guideHeading}>{HELP.guideHeading}</Text>
          {HELP.items.map((item) => (
            <View key={item.title} style={styles.item}>
              <Text style={styles.bullet}>
                <Text style={styles.itemTitle}>{`• ${item.title}: `}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
              </Text>
              {'sub' in item &&
                item.sub?.map((s) => (
                  <Text key={s.title} style={styles.subBullet}>
                    <Text style={styles.subTitle}>{`• ${s.title}: `}</Text>
                    <Text style={styles.itemBody}>{s.body}</Text>
                  </Text>
                ))}
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
    overflow: 'hidden',
  },
  content: { paddingHorizontal: 13, paddingTop: 21, paddingBottom: 28, gap: 12 },
  title: {
    color: colors.textOnDark,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },
  intro: {
    color: colors.textOnDark,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    lineHeight: 16,
  },
  guideHeading: {
    color: colors.textOnDark,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  item: { gap: 6 },
  bullet: { lineHeight: 16 },
  itemTitle: { color: colors.textOnDark, fontFamily: fonts.extrabold, fontSize: 12 },
  itemBody: { color: colors.textOnDark, fontFamily: fonts.regular, fontSize: 12 },
  subBullet: { lineHeight: 16, paddingLeft: 16 },
  subTitle: { color: colors.textOnDark, fontFamily: fonts.extrabold, fontSize: 12 },
});
