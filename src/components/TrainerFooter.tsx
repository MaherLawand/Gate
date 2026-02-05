import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

type TrainerRoute = "dashboard" | "clients" | "schedule" | "Gate";

export default function TrainerFooter() {
  const router = useRouter();
  const segments = useSegments();
  const current = segments[segments.length - 1];

  const navigate = (path: TrainerRoute) => {
    if (current !== path) {
      router.replace(`/trainer/${path}` as const);
    }
  };

  const iconColor = (route: TrainerRoute) =>
    current === route ? colors.primary : colors.textSecondary;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safe}>
      <View style={styles.container}>
        {/* DASHBOARD */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigate("dashboard")}
        >
          <Ionicons
            name="speedometer-outline"
            size={20}
            color={iconColor("dashboard")}
          />
        </TouchableOpacity>

        {/* CLIENTS */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigate("clients")}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={iconColor("clients")}
          />
        </TouchableOpacity>

        {/* SCHEDULE */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigate("schedule")}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={iconColor("schedule")}
          />
        </TouchableOpacity>

        {/* GATE (IMAGE AT END) */}
        <TouchableOpacity
          style={styles.logoButton}
          onPress={() => navigate("Gate")}
        >
          <Image
            source={require("../../assets/images/gate-logo.png")}
            style={[
              styles.logo,
              {
                tintColor:
                  current === "Gate" ? colors.primary : colors.textSecondary,
              },
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    height: 45, // ⬇️
  },

  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 36, // ⬅️ shorter footer
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  iconButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoButton: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 24,
    height: 24,
  },
});
