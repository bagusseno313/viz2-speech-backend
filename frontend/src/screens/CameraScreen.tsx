import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsFocused } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { fonts } from "../theme/typography";
import { MODES, DEFAULT_MODE_INDEX, wrapIndex, modeAt } from "../data/modes";
import { generateCaption } from "../services/captionService";
import { speak, speakQueued } from "../services/speech";
import { TopBar } from "../components/TopBar";
import { CarouselModes } from "../components/CarouselModes";
import { MicButton } from "../components/MicButton";
import { VoiceButton } from "../components/VoiceButton";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Camera">;
type Phase = "scan" | "processing" | "result";

const SWIPE_THRESHOLD = 40;

const PROCESSING_MIN_MS = 4000;
const PROCESSING_MAX_MS = 8000;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Camera screen — the Figma "Scan / Processing / Result" frames (one screen,
 * three phases). White screen with the top menu, a windowed camera preview, and
 * the mode carousel pinned to the bottom. A result shows a dark gradient caption
 * banner across the top of the preview plus the gold microphone in its center.
 */
export function CameraScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const [modeIndex, setModeIndex] = useState(DEFAULT_MODE_INDEX);
  const [phase, setPhase] = useState<Phase>("scan");
  const [caption, setCaption] = useState<string>("");
  // The captured still shown while processing / on the result, so the preview
  // looks frozen on the photographed object instead of staying live.
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const activeMode = modeAt(modeIndex);

  // Looping "please wait" cue played while a photo is being described. The
  // static asset loops until the processing phase ends.
  const waitPlayer = useAudioPlayer(require("../assets/wait.mp3"));

  useEffect(() => {
    waitPlayer.loop = true;
  }, [waitPlayer]);

  useEffect(() => {
    if (phase === "processing") {
      waitPlayer.seekTo(0);
      waitPlayer.play();
    } else {
      waitPlayer.pause();
    }
  }, [phase, waitPlayer]);

  // Returning to this screen (from VQA / Setting / Help, e.g. via the "Kembali"
  // double-tap) lands back on the live Scan view and re-announces the active
  // mode — queued so it is heard after the "Kembali" cue.
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setPhase("scan");
      setCaption("");
      setPhotoUri(null);
      speakQueued(activeMode.spokenLabel);
    });
    return unsubscribe;
  }, [navigation, activeMode.spokenLabel]);

  // --- Actions ---------------------------------------------------------------

  const selectMode = useCallback((nextIndex: number) => {
    const next = wrapIndex(nextIndex);
    setModeIndex(next);
    Haptics.selectionAsync();
    speak(MODES[next].spokenLabel);
    setPhase("scan");
    setCaption("");
    setPhotoUri(null);
  }, []);

  const changeMode = useCallback((dir: 1 | -1) => {
    setModeIndex((i) => {
      const next = wrapIndex(i + dir);
      Haptics.selectionAsync();
      speak(MODES[next].spokenLabel);
      return next;
    });
    setPhase("scan");
    setCaption("");
    setPhotoUri(null);
  }, []);

  const capture = useCallback(async () => {
    if (phase === "processing") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("processing");
    speak("Memproses gambar");
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      // Freeze the preview on the captured frame for processing + result.
      if (photo?.uri) setPhotoUri(photo.uri);
      const text = await generateCaption(activeMode.key, photo?.uri);
      // Hold on the processing screen (wait.mp3 looping) for a random 4–8s
      // window, then reveal the result whether or not the audio has finished.
      const wait =
        PROCESSING_MIN_MS +
        Math.random() * (PROCESSING_MAX_MS - PROCESSING_MIN_MS);
      await delay(wait);
      setCaption(text);
      setPhase("result");
      speak(text, { interrupt: false });
    } catch (error) {
      console.log("[CameraScreen] capture failed", error);
      setPhase("scan");
      setPhotoUri(null);
      speak("Maaf, gagal mengambil gambar. Silakan coba lagi.");
    }
  }, [phase, activeMode.key]);

  // From a result, a double-tap returns to the live Scan view keeping the mode
  // the user last used, and re-announces that mode.
  const backToScan = useCallback(() => {
    Haptics.selectionAsync();
    setPhase("scan");
    setCaption("");
    setPhotoUri(null);
    speak(activeMode.spokenLabel);
  }, [activeMode.spokenLabel]);

  const goToVQA = useCallback(() => {
    if (phase !== "result" || !caption) {
      speak("Ambil gambar terlebih dahulu dengan sentuh dua kali.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate("VQA", { mode: activeMode.key, caption });
  }, [phase, caption, activeMode.key, navigation]);

  // --- Gestures --------------------------------------------------------------

  const gesture = useMemo(() => {
    // Single tap just announces "Foto" so the user knows the capture target;
    // it only fires when the double-tap fails (Exclusive below).
    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .runOnJS(true)
      .onEnd(() => speak("Foto"));

    // Double tap: capture while scanning, or return to scan from a result.
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(320)
      .runOnJS(true)
      .onEnd(() => (phase === "result" ? backToScan() : capture()));

    const threeFingerTap = Gesture.Tap()
      .minPointers(3)
      .maxDuration(400)
      .runOnJS(true)
      .onEnd(() => goToVQA());

    const twoFingerSwipe = Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .runOnJS(true)
      .onEnd((e) => {
        if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
          changeMode(e.translationX < 0 ? 1 : -1);
        }
      });

    return Gesture.Race(
      threeFingerTap,
      twoFingerSwipe,
      Gesture.Exclusive(doubleTap, singleTap),
    );
  }, [capture, goToVQA, changeMode, backToScan, phase]);

  // --- Permission gate -------------------------------------------------------

  if (!permission) {
    return <View style={styles.permissionContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>
          Viz2Speech memerlukan akses kamera untuk mendeskripsikan sekitarmu.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={() => {
            speak("Izinkan akses kamera");
            requestPermission();
          }}
          accessibilityRole="button"
          accessibilityLabel="Izinkan akses kamera"
        >
          <Text style={styles.permissionBtnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Screen ----------------------------------------------------------------

  const a11yLabel =
    `Mode ${activeMode.label}. ` +
    "Sentuh dua kali untuk mengambil gambar. " +
    "Usap dua jari untuk mengganti mode. " +
    "Sentuh tiga jari untuk bertanya lanjutan.";

  // Live camera only while scanning; once a shot is taken we keep the frozen
  // still on screen through processing and the result.
  const showFrozen = !!photoUri && phase !== "scan";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* TopBar lives outside the camera gesture surface so its chips own their
          own single-tap (announce) / double-tap (open) handling. */}
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          onPressSettings={() => navigation.navigate("Setting")}
          onPressHelp={() => navigation.navigate("Help")}
        />
      </View>

      {/* Windowed camera preview. Kept mounted and toggled with `active` (rather
          than conditionally rendered) so it never remounts at the wrong size when
          returning from VQA / Setting / Help. */}
      <View style={styles.cameraRegion}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={isFocused}
        />

        {/* Frozen captured frame over the live preview. */}
        {showFrozen && (
          <Image
            source={{ uri: photoUri! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Transparent gesture surface (double-tap capture, 3-finger VQA,
            2-finger swipe to change mode). */}
        <GestureDetector gesture={gesture}>
          <View
            style={StyleSheet.absoluteFill}
            accessible
            accessibilityLabel={a11yLabel}
            accessibilityHint="Layar kamera dengan kontrol berbasis gestur."
          />
        </GestureDetector>

        {/* Caption banner — gradient + uppercase white text, after a result. */}
        {phase === "result" && !!caption && (
          <LinearGradient
            colors={["rgba(0,0,0,0.92)", "rgba(0,0,0,0)"]}
            style={styles.captionBanner}
            pointerEvents="none"
          >
            <Text style={styles.captionText}>{caption.toUpperCase()}</Text>
          </LinearGradient>
        )}

        {/* Processing spinner. */}
        {phase === "processing" && (
          <View style={styles.centerFill} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.micGold} />
          </View>
        )}

        {/* Gold mic, low in the preview (Figma Result frame). Double-tap it to
            open the follow-up question screen. */}
        {phase === "result" && (
          <View style={styles.resultMic} pointerEvents="box-none">
            <VoiceButton label="Mikrofon" onActivate={goToVQA}>
              <MicButton size={110} />
            </VoiceButton>
          </View>
        )}

        {/* Web/desktop fallback: a mouse cannot perform the multi-finger
            gestures, so expose the same actions as buttons. */}
        {Platform.OS === "web" && (
          <View style={styles.webControls} pointerEvents="box-none">
            <WebButton
              icon="chevron-left"
              label="Mode sebelumnya"
              onPress={() => changeMode(-1)}
            />
            <WebButton
              icon="camera"
              label="Ambil gambar"
              big
              onPress={() => capture()}
            />
            <WebButton
              icon="comment-question-outline"
              label="Tanya jawab"
              onPress={() => goToVQA()}
            />
            <WebButton
              icon="chevron-right"
              label="Mode berikutnya"
              onPress={() => changeMode(1)}
            />
          </View>
        )}
      </View>

      <CarouselModes activeIndex={modeIndex} onSelectMode={selectMode} />
      <View style={{ height: insets.bottom, backgroundColor: colors.screen }} />
    </View>
  );
}

function WebButton({
  icon,
  label,
  onPress,
  big,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  big?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.webBtn, big && styles.webBtnBig]}
      onPress={() => {
        speak(label);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon as any}
        size={big ? 30 : 24}
        color={colors.textOnDark}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screen },

  cameraRegion: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: "hidden",
  },

  captionBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 165,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 28,
  },
  captionText: {
    color: colors.textOnDark,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
  },

  centerFill: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },

  // Result mic sits low in the preview (not centered) — see the Figma Result frame.
  resultMic: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: "center",
  },

  webControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  webBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  webBtnBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.micGold,
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 24,
  },
  permissionText: {
    color: colors.textOnDark,
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: colors.textOnDark,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
