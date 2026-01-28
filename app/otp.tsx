import { useLocalSearchParams, useRouter } from "expo-router";
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
        router.replace("/trainer/dashboard");
        return;
      }
      
        router.replace("/client/home");
        return;
      
    } catch (e: any) {
      Alert.alert("OTP Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Phone</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to you</Text>

      <TextInput
        keyboardType="numeric"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />

      <AppButton
        title={loading ? "Verifying..." : "Verify OTP"}
        onPress={handleConfirm}
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
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
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
