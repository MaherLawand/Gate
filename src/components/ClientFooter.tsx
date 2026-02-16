import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export default function ClientFooter() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[segments.length - 1];

  const go = (path: string) => {
    // 🚨 ALWAYS replace, never push
    router.replace(path as any);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.container}>
        {/* Sessions */}
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => go("(app)/client/ClientWeeklyPreferencesScreen")}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={
              current === "ClientWeeklyPreferencesScreen"
                ? colors.primary
                : colors.textSecondary
            }
          />
        </TouchableOpacity>

        {/* Gate */}
        <TouchableOpacity
          style={styles.centerButton}
          onPress={() => router.replace("/(app)/client/Gate")}
        >
          <Image
            source={require("../../assets/images/gate-logo.png")}
            style={[
              styles.logo,
              { tintColor: current ==="Gate" ? colors.primary : colors.textSecondary },
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Info */}
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => go("/client/Info")}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={current === "Info" ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    height: 45, // ⬇️ smaller footer
  },

  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 50, // ⬇️ smaller footer
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  sideButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  centerButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 36, // ⬇️ smaller logo
    height: 36,
  },
});
