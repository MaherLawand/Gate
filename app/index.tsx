import { sendOtp } from "@/src/services/phoneAuth";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppButton from "../src/components/AppButton";
import { colors } from "../src/theme/colors";

export default function LoginScreen() {
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit app", "Are you sure you want to exit?", [
          { text: "Cancel", style: "cancel" },
          { text: "Exit", onPress: () => BackHandler.exitApp() },
        ]);
        return true; // ⛔ prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => {
        subscription.remove(); // ✅ THIS IS THE FIX
      };
    }, [])
  );
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [phoneRaw, setPhoneRaw] = useState(""); // +961XXXXXXXX
  const [loading, setLoading] = useState(false);

  const normalizeLebanesePhone = (input: string) => {
    let digits = input.replace(/\D/g, "");

    if (digits.startsWith("961")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);

    digits = digits.slice(0, 8);

    let formatted = "";
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += " " + digits.slice(2, 5);
    if (digits.length > 5) formatted += " " + digits.slice(5, 8);

    return {
      formatted,
      raw: digits.length === 8 ? `+961${digits}` : "",
      isValid: digits.length === 8,
    };
  };

  const handleLogin = async () => {
    if (!phoneRaw) {
      Alert.alert("Invalid phone", "Enter a valid Lebanese phone number");
      return;
    }

    try {
      setLoading(true);

      await sendOtp(phoneRaw);

      router.push({
        pathname: "/otp",
        params: { phone: phoneRaw },
      });
    } catch (e: any) {
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Enter your phone number to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="70 123 456"
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(text) => {
          const result = normalizeLebanesePhone(text);
          setPhone(result.formatted);
          setPhoneRaw(result.raw);
        }}
        maxLength={11}
      />

      <AppButton
        title={loading ? "Sending code..." : "Continue"}
        onPress={handleLogin}
      />
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
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
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
});
