import AnimatedAppear from "@/src/components/AnimatedAppear";
import { useAuthReady } from "@/src/hooks/useAuthReady";
import { sendOtp } from "@/src/services/phoneAuth";
import { ResizeMode, Video } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import "react-phone-number-input/style.css";
import AppButton from "../src/components/AppButton";
import { colors } from "../src/theme/colors";
import { typography } from "../src/theme/typography";

export default function Index() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);

  const { ready, user } = useAuthReady();

  const [showLogin, setShowLogin] = useState(false);
  const [digits, setDigits] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  /* 🔙 Back handler */
  useFocusEffect(
    useCallback(() => {
      if (!ready || user) {
        return;
      }

      console.log("🔵 INDEX: back handler mounted");

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

      return () => {
        console.log("🔵 INDEX: back handler removed");
        sub.remove();
      };
    }, [ready, user])
  );

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
      router.replace("/otp");
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ⛔ HARD GUARD
     - Auth not ready → block
     - User signed in → entry will redirect */
  if (!ready || user) {
    return <View style={styles.black} />;
  }
  console.log(
    showLogin ? "🟢 INDEX: showing LOGIN UI" : "🟣 INDEX: showing INTRO VIDEO"
  );

  /* 🎬 STEP 1: Intro video */
  if (!showLogin) {
    return (
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={require("../assets/images/Final_Gate_animation.mp4")}
          resizeMode={ResizeMode.COVER}
          style={StyleSheet.absoluteFill}
          shouldPlay
          isLooping={false}
          onLoadStart={() => console.log("🟣 VIDEO: load start")}
          onLoad={() => console.log("🟣 VIDEO: loaded")}
          onPlaybackStatusUpdate={(status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              console.log("🟣 VIDEO: finished → show login");
              setShowLogin(true);
            }
          }}
        />
      </View>
    );
  }

  /* 🧾 STEP 2: Login UI */
  return (
    <View style={styles.container}>
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
      <AnimatedAppear delay={120}>
        <View style={styles.phoneRow}>
          <View style={styles.prefixBox}>
            <Text style={[typography.bodyMedium, styles.prefixText]}>+961</Text>
          </View>

          <TextInput
            style={[typography.body, styles.phoneInput]}
            keyboardType="number-pad"
            placeholder="XX XXX XXX"
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: "center",
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
});
