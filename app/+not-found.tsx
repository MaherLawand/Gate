// app/+not-found.tsx
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import auth from "@react-native-firebase/auth";
import AppButton from "@/src/components/AppButton";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";

export default function NotFoundScreen() {
  const router = useRouter();

  const handleGoHome = () => {
    const user = auth().currentUser;

    if (user) {
      // Logged in → go to main app
      router.replace("/(app)");
    } else {
      // Not logged in → go to auth
      router.replace("/");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Text
        style={[
          typography.heading,
          { color: colors.textPrimary, marginBottom: 12 },
        ]}
      >
        404
      </Text>

      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            textAlign: "center",
            marginBottom: 30,
          },
        ]}
      >
        The page you're looking for doesn’t exist.
      </Text>

      <AppButton
        title="Go Home"
        onPress={handleGoHome}
      />
    </View>
  );
}