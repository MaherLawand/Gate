import AnimatedAppear from "@/src/components/AnimatedAppear";
import { registerForPushNotifications } from "@/src/services/registerForPushNotifications";
import { typography } from "@/src/theme/typography";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import AppButton from "../src/components/AppButton";
import { confirmOtp } from "../src/services/phoneAuth";
import { colors } from "../src/theme/colors";

export default function OTPScreen() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!code || code.length < 6) {
      Alert.alert("Invalid code", "Enter the 6-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const client = await confirmOtp(code);

      if (client.role === "trainer") {
        registerForPushNotifications();
        router.replace("/trainer/dashboard");
        return;
      }
      registerForPushNotifications();
      router.replace("/client/Gate");
      return;
    } catch (e: any) {
      Alert.alert("OTP Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          placeholderTextColor={colors.textSecondary}
          style={[typography.body, styles.input]}
          editable={!loading}
        />
      </AnimatedAppear>

      <AnimatedAppear delay={160}>
        <AppButton
          title={loading ? "Verifying..." : "Verify OTP"}
          onPress={handleConfirm}
        />
      </AnimatedAppear>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    color: colors.textPrimary,
    marginBottom: 20,
    alignSelf: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: 20,
    alignSelf: "center",
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
});
