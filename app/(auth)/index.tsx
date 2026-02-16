import AnimatedAppear from "@/src/components/AnimatedAppear";
import { VenomBubble } from "@/src/components/InteractiveGlassBubbles";
import { useAuthReady } from "@/src/hooks/useAuthReady";
import { sendOtp } from "@/src/services/phoneAuth";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { withSequence } from "react-native-reanimated";
import { Image } from "react-native";

import {
  Alert,
  BackHandler,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AppButton from "../../src/components/AppButton";
import { colors } from "../../src/theme/colors";
import { typography } from "../../src/theme/typography";
import { auth, firestore } from "@/src/services/firebase";
import * as Notifications from "expo-notifications";
const { width, height } = Dimensions.get("window");

type AppState =
  | "checking"
  | "signedOutIntro"
  | "login"
  | "signedInLoading";

export default function Index() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  // const { ready, user } = useAuthReady();

  // const [showLogin, setShowLogin] = useState(false);
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
const [appState, setAppState] = useState<
  "checking" | "signedOutIntro" | "login" | "signedInLoading"
>("checking");

useEffect(() => {
  const unsub = auth().onAuthStateChanged((user) => {
    if (!user) {
      setAppState("signedOutIntro");
      return;
    }

    // 🔥 JUST redirect to app root
    router.replace("/(app)");
  });

  return unsub;
}, []);

  
  /* 🔙 Back handler */
  useFocusEffect(
    useCallback(() => {
      if (appState !== "login" || Platform.OS !== "android") {
        return;
      }

      const onBackPress = () => {
        Alert.alert("Exit app", "Are you sure you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => sub.remove();
    }, [appState])
  );
  useEffect(() => {
    if (appState === "signedOutIntro") {
      const timer = setTimeout(() => {
        console.log("⏱ fallback → show login");
        setAppState("login");
      }, 10000); // match your video length

      return () => clearTimeout(timer);
    }
  }, [appState]);

  useFocusEffect(
    useCallback(() => {
      setLoading(false);
    }, [])
  );

  useEffect(() => {
    const initPush = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
  
        if (status !== "granted") {
          console.log("❌ Permission not granted");
          return;
        }
  
        const token = await Notifications.getExpoPushTokenAsync();
        console.log("📲 Expo Push Token:", token.data);
      } catch (e) {
        console.log("❌ Push permission error:", e);
      }
    };
  
    initPush();
  }, []);
  

  const handlePhoneChange = (text: string) => {
    // digits only
    let d = text.replace(/\D/g, "");

    // max Lebanese length
    d = d.slice(0, 8);

    setDigits(d);
  };
  const getPhoneRaw = () => {
    if (digits.length !== 8) return "";

    // normalize on submit
    const normalized = digits.startsWith("0") ? digits.slice(1) : digits;

    return `+961${normalized}`;
  };
  const formatLebanese = (d: string) => {
    if (d.length !== 8) return d;
    return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  };
  const normalizeLebanesePhone = (input: string) => {
    // keep digits only
    let digits = input.replace(/\D/g, "");

    // prevent country code being typed
    if (digits.startsWith("961")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);

    // max 8 digits
    digits = digits.slice(0, 8);

    let formatted = "";

    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 5) {
      formatted = `${digits.slice(0, 2)} ${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(
        5
      )}`;
    }

    return {
      formatted,
      raw: digits.length === 8 ? `+961${digits}` : "",
    };
  };

  const handleLogin = async () => {
    const phoneRaw = getPhoneRaw();

    if (!phoneRaw) {
      Alert.alert("Invalid phone number");
      return;
    }

    try {
      setLoading(true);
      await sendOtp(phoneRaw);
      router.push("/otp");
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };
  const impulseX = useSharedValue(0);
  const impulseY = useSharedValue(0);

  const onBackgroundPress = (x: number, y: number) => {
    const cx = width / 2;
    const cy = height / 2;

    const dx = x - cx;
    const dy = y - cy;

    // normalize distance (closer = stronger)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const force = 1 - Math.min(distance / maxDist, 1);

    const strength = 60 * force; // 🔥 THIS is the key

    impulseX.value = withSequence(
      withSpring(dx / strength, {
        damping: 8,
        stiffness: 220,
        mass: 0.6,
      }),
      withTiming(0, { duration: 2200 })
    );

    impulseY.value = withSequence(
      withSpring(dy / strength, {
        damping: 8,
        stiffness: 220,
        mass: 0.6,
      }),
      withTiming(0, { duration: 2200 })
    );
  };

  /* ⛔ HARD GUARD
     - Auth not ready → block
     - User signed in → entry will redirect */
  // if (!ready || user) {
  //   return <View style={styles.black} />;
  // }
  // console.log(
  //   showLogin ? "🟢 INDEX: showing LOGIN UI" : "🟣 INDEX: showing INTRO VIDEO"
  // );

if (appState === "checking" || appState === "signedInLoading") {
  return (
    <View style={styles.container}>
       <Image
              source={require("../../assets/images/gate-logo.png")}
              style={styles.logo}
              resizeMode="contain"
              onLoadStart={() => console.log("🟡 ENTRY: logo load start")}
              onLoadEnd={() => console.log("🟢 ENTRY: logo load end")}
            />
    </View>
  );
}

  /* 🎬 STEP 1: Intro video */


  if (appState === "signedOutIntro") {
    return (
      <View style={{ flex: 1 }}>
        <Video
          ref={videoRef}
          source={require("../../assets/images/Final_Gate_animation.mp4")}
          style={{ width: "100%", height: "100%" }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted
          isLooping={false}
          progressUpdateIntervalMillis={250}
          onReadyForDisplay={() => console.log("🎬 ready for display")}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;

            if (status.didJustFinish) {
              console.log("🎬 finished");
            setAppState("login");
            }
          }}
        />
      </View>
    );
  }

  /* 🧾 STEP 2: Login UI */
  /* 🧾 STEP 2: Login UI */
  return (
    <View style={styles.root}>
      {/* BACKGROUND PRESS LAYER */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) =>
          onBackgroundPress(e.nativeEvent.locationX, e.nativeEvent.locationY)
        }
      >
        {/* DARK BASE */}
        <View style={styles.backgroundBase} />

        <VenomBubble
          size={360}
          baseX={-120}
          baseY={40}
          strength={3}
          impulseX={impulseX}
          impulseY={impulseY}
          colors={["#DE1F2E", "rgba(175, 29, 29, 0.15)"]}
        />

        {/* BUBBLE 2 – mid depth */}
        <VenomBubble
          size={240}
          baseX={width - 220}
          baseY={250}
          strength={2}
          impulseX={impulseX}
          impulseY={impulseY}
          colors={["#DE1F2E", "rgba(175, 29, 29, 0.15)"]}
        />

        {/* BUBBLE 3 – background */}
        <VenomBubble
          size={280}
          baseX={40}
          baseY={height - 380}
          strength={2}
          impulseX={impulseX}
          impulseY={impulseY}
          colors={["#DE1F2E", "rgba(175, 29, 29, 0.15)"]}
        />
      </Pressable>

      {/* FOREGROUND UI */}
      <View style={styles.container}>
        <BlurView
          intensity={100} // strong blur
          tint="dark"
          style={styles.glassCard}
        >
          <View style={styles.glassOverlay}>
            <AnimatedAppear delay={0}>
              <Text
                style={[
                  typography.heading,
                  { color: colors.textPrimary },
                  styles.title,
                ]}
              >
                Welcome
              </Text>
            </AnimatedAppear>

            <AnimatedAppear delay={60}>
              <Text style={[typography.body, styles.subtitle]}>
                Enter your phone number to continue
              </Text>
            </AnimatedAppear>

            <View style={styles.contentStack}>
              <AnimatedAppear delay={120}>
                <View style={styles.phoneRow}>
                  <View style={styles.prefixBox}>
                    <Text style={[typography.bodyMedium, styles.prefixText]}>
                      +961
                    </Text>
                  </View>

                  <TextInput
                    style={[typography.body, styles.phoneInput]}
                    keyboardType="number-pad"
                    placeholder="XX XXX XXX"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={focused ? digits : formatLebanese(digits)}
                    onChangeText={handlePhoneChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </View>
              </AnimatedAppear>

              <AnimatedAppear delay={160}>
                <AppButton
                  title={loading ? "Sending code..." : "Continue"}
                  onPress={handleLogin}
                />
              </AnimatedAppear>
            </View>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: {
    flex: 1,
    backgroundColor: "black",
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  root: {
    flex: 1,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0F14", // dark premium base
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // 👈 key
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    overflow: "hidden",
  },

  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border ?? "rgba(255,255,255,0.08)",
  },

  prefixText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },

  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.textPrimary,
  },
  glassCard: {
    alignSelf: "center",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
  },
  glassOverlay: {
    paddingVertical: 40, // 👈 taller feel
    paddingHorizontal: 28,
    backgroundColor: "rgba(0,0,0,0.45)", // blackish glass tint
    width: "100%",
  },
  contentStack: {
    gap: 10,
  },
  logo: {
    width: 160,
    height: 160,
  },
});
