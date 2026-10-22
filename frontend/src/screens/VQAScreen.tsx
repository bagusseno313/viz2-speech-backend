import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { VQA_PROMPT } from '../data/content';
import { askFollowUp } from '../services/vqaService';
import { speak } from '../services/speech';
import { MicButton } from '../components/MicButton';
import { VoiceButton } from '../components/VoiceButton';
import { TopBar } from '../components/TopBar';
import { TapToGoBack } from '../components/TapToGoBack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VQA'>;
type Status = 'listening' | 'processing' | 'answered';

/**
 * Follow-up question screen (the Figma "VQA_Speech" / "VQA_Result" frames). Two
 * stacked black rounded panels:
 *   - top: the question / prompt (Plus Jakarta Sans, centered)
 *   - bottom: the big gold mic while listening, then the spoken answer.
 */
export function VQAScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { caption } = route.params;
  const [status, setStatus] = useState<Status>('listening');
  const [question, setQuestion] = useState<string>(VQA_PROMPT);
  const [answer, setAnswer] = useState<string>('');

  useEffect(() => {
    speak(`${VQA_PROMPT}. Sentuh tombol mikrofon lalu ajukan pertanyaanmu.`);
  }, []);

  // STUB: tapping the mic simulates recording + transcribing a question.
  const ask = async () => {
    if (status === 'processing') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('processing');
    speak('Mendengarkan');
    const spokenQuestion = 'Jelaskan lebih detail gambar tersebut';
    setQuestion(spokenQuestion);
    const res = await askFollowUp(spokenQuestion, caption);
    setAnswer(res.answer);
    setStatus('answered');
    speak(res.answer);
  };

  return (
    <TapToGoBack
      onBack={() => navigation.goBack()}
      style={[styles.container, { paddingTop: insets.top }]}
      accessibilityLabel="Hasil tanya jawab">
      <StatusBar style="dark" />

      <TopBar
        onPressSettings={() => navigation.navigate('Setting')}
        onPressHelp={() => navigation.navigate('Help')}
      />

      <View style={[styles.body, { paddingBottom: insets.bottom + 5 }]}>
        {/* Top panel: the question */}
        <View style={styles.panel}>
          <Text style={styles.panelText}>{question}</Text>
        </View>

        {/* Bottom panel: mic while listening, answer once available */}
        <View style={styles.panel}>
          {status === 'answered' ? (
            <ScrollView contentContainerStyle={styles.answerScroll}>
              <Text style={styles.panelText}>{answer}</Text>
            </ScrollView>
          ) : status === 'processing' ? (
            <ActivityIndicator size="large" color={colors.micGold} />
          ) : (
            <VoiceButton label="Mikrofon" onActivate={ask}>
              <MicButton size={155} />
            </VoiceButton>
          )}
        </View>
      </View>
    </TapToGoBack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  body: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 6,
    gap: 14,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: 10,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelText: {
    color: colors.textOnDark,
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    lineHeight: 19,
    textAlign: 'center',
  },
  answerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
