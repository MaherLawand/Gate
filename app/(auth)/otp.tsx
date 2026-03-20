import AnimatedAppear from "@/src/components/AnimatedAppear";
import { VenomBubble } from "@/src/components/InteractiveGlassBubbles";
import { registerForPushNotifications } from "@/src/services/registerForPushNotifications";
import { typography } from "@/src/theme/typography";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AppButton from "../../src/components/AppButton";
import { confirmOtp, normalizePhone } from "../../src/services/phoneAuth";
import { colors } from "../../src/theme/colors";
import { auth } from "@/src/services/firebase";
import { log } from "@/src/utils/logger";
import { doc,root } from "@/src/services/db";

const { width, height } = Dimensions.get("window");

export default function OTPScreen() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const impulseX = useSharedValue(0);
  const impulseY = useSharedValue(0);
useEffect(() => {
  log("🟦 [OTP] Mounted");
  return () => log("🟥 [OTP] Unmounted");
}, []);

useEffect(() => {
  const unsubscribe = auth().onAuthStateChanged(async (user) => {
    if (!user) return;

    log("🔥 [OTP] Auth state changed → user detected:", user.uid);

    try {
      const phone = normalizePhone(user.phoneNumber || "");
      const uid = user.uid;

      // 🔥 SAME LOGIC (reuse ideally)
      const trainerSnap = await doc("users", uid).get();

      if (trainerSnap.exists()) {
        log("🚦 [OTP] Auto-route trainer");
        router.replace("/(app)/trainer/dashboard");
        return;
      }

      const clientSnap = await root()
        .collection("clients")
        .where("phone", "==", phone)
        .limit(1)
        .get();

      if (!clientSnap.empty) {
        const clientDoc = clientSnap.docs[0];
        const clientData = clientDoc.data();

        if (!clientData.authUid) {
          await clientDoc.ref.update({
            authUid: uid,
            phoneVerified: true,
          });
        }

        log("🚦 [OTP] Auto-route client");
        router.replace("/(app)/client/Gate");
        return;
      }

      log("❌ [OTP] No role found → signing out");
      await auth().signOut();
      router.replace("/(auth)");

    } catch (err: any) {
      log("🔥 [OTP] Auto auth error:", err?.message);
    }
  });

  return unsubscribe;
}, []);

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

const handleConfirm = async () => {
  log("🔘 [OTP] Confirm pressed");

  if (isSubmitting) return;

  if (!code || code.length < 6) {
    Alert.alert("Invalid code", "Enter the 6-digit OTP");
    return;
  }

  try {
    setLoading(true);
    setIsSubmitting(true);

    log("🔐 [OTP] Calling confirmOtp");

    const result = await confirmOtp(code);

    log("✅ [OTP] confirmOtp success:", result);

    // 🚨 HARD VALIDATION
    if (!result || !result.role) {
      throw new Error("Invalid authentication state.");
    }

    if (result.role === "trainer") {
      log("🚦 [OTP] Routing to /(app)/trainer/dashboard");
      router.replace("/(app)/trainer/dashboard");

    } else if (result.role === "client") {
      log("🚦 [OTP] Routing to /(app)/client/Gate");
      router.replace("/(app)/client/Gate");

    } else {
      // 🚨 Unknown role → block access
      throw new Error("Unauthorized role.");
    }

    // Only register push if valid role
    await registerForPushNotifications();

  } catch (e: any) {
    log("🚦 [OTP] Routing to /(auth)");
    router.replace("/(auth)");

    Alert.alert("OTP Failed", e?.message || "Something went wrong.");
  } finally {
    setLoading(false);
    setIsSubmitting(false);
  }
};

  return (
    <View style={styles.root}>
      {/* BACKGROUND */}
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
      {/* FOREGROUND */}
      <View style={styles.container}>
        <View style={styles.glassCard}>
          <View style={styles.glassOverlay}>
            <View style={styles.contentStack}>
              <AnimatedAppear delay={0}>
                <Text
                  style={[
                    typography.heading,
                    styles.title,
                    { color: colors.textPrimary },
                  ]}
                >
                  Verify Phone
                </Text>
              </AnimatedAppear>

              <AnimatedAppear delay={60}>
                <Text style={[typography.body, styles.subtitle]}>
                  Enter the 6-digit code sent to you
                </Text>
              </AnimatedAppear>

              <AnimatedAppear delay={120}>
                <TextInput
                  keyboardType="numeric"
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  style={[typography.body, styles.input]}
                  editable={!loading}
                  maxLength={6}
                />
              </AnimatedAppear>

              <AnimatedAppear delay={160}>
                <AppButton
                  title={isSubmitting ? "Verifying..." : "Verify OTP"}
                  onPress={handleConfirm}
                  disabled={isSubmitting}
                />
              </AnimatedAppear>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0F14",
  },

  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  glassCard: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(180, 60, 60, 0.35)",
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  glassOverlay: {
    paddingVertical: 34,
    paddingHorizontal: 28,
  },

  contentStack: {
    gap: 22,
  },

  title: {
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: colors.textSecondary,
  },

  input: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    textAlign: "center",
    letterSpacing: 4, // 🔥 OTP feel
  },
});
