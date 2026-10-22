import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import { VQA_PROMPT } from "../data/content";
import { askFollowUp } from "../services/vqaService";
import { transcribeAudio } from "../services/sttService";
import { speak } from "../services/speech";
import { MicButton } from "../components/MicButton";
import { VoiceButton } from "../components/VoiceButton";
import { TopBar } from "../components/TopBar";
import { TapToGoBack } from "../components/TapToGoBack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VQA">;
type Status = "idle" | "listening" | "processing" | "answered";

/**
 * Follow-up question screen (the Figma "VQA_Speech" / "VQA_Result" frames). Two
 * stacked black rounded panels:
 *   - top: the question / prompt (Plus Jakarta Sans, centered)
 *   - bottom: the big gold mic while listening, then the spoken answer.
 */
export function VQAScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { caption, mode } = route.params;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isRecordingRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [question, setQuestion] = useState<string>(VQA_PROMPT);
  const [questionInput, setQuestionInput] = useState<string>(VQA_PROMPT);
  const [answer, setAnswer] = useState<string>("");

  const submitQuestion = useCallback(
    async (nextQuestion?: string) => {
      const finalQuestion =
        (nextQuestion ?? questionInput).trim() || VQA_PROMPT;
      if (status === "processing") return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStatus("processing");
      setQuestion(finalQuestion);
      setQuestionInput(finalQuestion);
      speak("Mendengarkan");

      try {
        const res = await askFollowUp(finalQuestion, caption, mode);
        setAnswer(res.answer);
        setStatus("answered");
        speak(res.answer);
      } catch (error) {
        console.log("[VQAScreen] ask failed", error);
        const fallbackAnswer =
          "Saya tidak dapat menjawab pertanyaan saat ini, tetapi gambar sudah berhasil diterima dan deskripsi utama telah diproses.";
        setAnswer(fallbackAnswer);
        setStatus("answered");
        speak(fallbackAnswer);
      }
    },
    [caption, mode, questionInput, status],
  );

  const stopListeningAndSubmit = useCallback(async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    const shouldStop = isRecordingRef.current || recorder.isRecording;
    if (!shouldStop) {
      console.log("NOT RECORDING");
      return;
    }

    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      isRecordingRef.current = false;

      const recordedUri = recorder.uri;
      if (!recordedUri) {
        speak("Saya tidak mendengar pertanyaan. Silakan coba lagi.");
        setStatus("listening");
        return;
      }

      const transcribedText = await transcribeAudio(recordedUri);
      const nextQuestion = transcribedText || questionInput.trim();
      if (!nextQuestion) {
        speak("Saya tidak menangkap pertanyaan yang valid. Coba ulang");
        setStatus("listening");
        return;
      }

      setQuestionInput(nextQuestion);
      await submitQuestion(nextQuestion);
    } catch (error) {
      console.log("[VQAScreen] STT failed", error);
      isRecordingRef.current = false;
      speak("Gagal memproses suara. Silakan ketik pertanyaanmu.");
      setStatus("listening");
    }
  }, [questionInput, recorder, submitQuestion]);

  const startListening = useCallback(async () => {
    if (status === "processing") return;

    if (status === "listening" || isRecordingRef.current) {
      await stopListeningAndSubmit();
      return;
    }

    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        speak("Izin mikrofon belum diberikan.");
        return;
      }

      speak("Mendengarkan");

      setTimeout(async () => {
        await recorder.prepareToRecordAsync();
        recorder.record();
        isRecordingRef.current = true;
        setStatus("listening");
      }, 500);

      recordingTimeoutRef.current = setTimeout(() => {
        void stopListeningAndSubmit();
      }, 5000);
    } catch (error) {
      console.log("[VQAScreen] startListening failed", error);
      isRecordingRef.current = false;
      speak("Gagal membuka mikrofon.");
      setStatus("listening");
    }
  }, [recorder, status, stopListeningAndSubmit]);

  const ask = useCallback(async () => {
    const finalQuestion = questionInput.trim();
    if (!finalQuestion) {
      speak("Ketik pertanyaan terlebih dahulu.");
      return;
    }

    await submitQuestion(finalQuestion);
  }, [questionInput, submitQuestion]);

  useEffect(() => {
    speak(`${VQA_PROMPT}Rekam pertanyaanmu lalu kirim.`);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <TapToGoBack
      onBack={() => navigation.goBack()}
      style={[styles.container, { paddingTop: insets.top }]}
      accessibilityLabel="Hasil tanya jawab"
    >
      <StatusBar style="dark" />

      <TopBar
        onPressSettings={() => navigation.navigate("Setting")}
        onPressHelp={() => navigation.navigate("Help")}
      />

      <View style={[styles.body, { paddingBottom: insets.bottom + 5 }]}>
        {/* Top panel: the question */}
        <View style={styles.panel}>
          {status === "answered" ? (
            <Text style={styles.panelText}>{question}</Text>
          ) : (
            <TextInput
              value={questionInput}
              onChangeText={setQuestionInput}
              placeholder="Tulis pertanyaanmu..."
              placeholderTextColor={colors.textOnDark + "99"}
              style={styles.input}
              multiline
              textAlign="center"
              accessibilityLabel="Pertanyaan untuk VQA"
              onSubmitEditing={() => {
                void ask();
              }}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          )}
        </View>

        {/* Bottom panel: mic while listening, answer once available */}
        <View style={styles.panel}>
          {status === "answered" ? (
            <ScrollView contentContainerStyle={styles.answerScroll}>
              <Text style={styles.panelText}>{answer}</Text>
            </ScrollView>
          ) : status === "processing" ? (
            <ActivityIndicator size="large" color={colors.micGold} />
          ) : (
            <VoiceButton
              label="Mikrofon"
              activateLabel={
                status === "listening" ? "Stop rekaman" : "Mendengarkan"
              }
              triggerMode="double-tap"
              onActivate={() => {
                void startListening();
              }}
            >
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
    alignItems: "center",
    justifyContent: "center",
  },
  panelText: {
    color: colors.textOnDark,
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    lineHeight: 19,
    textAlign: "center",
  },
  input: {
    width: "100%",
    color: colors.textOnDark,
    fontFamily: fonts.jakartaBold,
    fontSize: 15,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  answerScroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
});
