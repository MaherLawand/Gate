import { useRouter, useSegments } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";

type TrainerRoute = "dashboard" | "clients" | "schedule";

export default function TrainerFooter() {
  const router = useRouter();
  const segments = useSegments();

  const navigate = (path: TrainerRoute) => {
    const current = segments[segments.length - 1];
    if (current !== path) {
      console.log(`Navigating to /trainer/${path}`);
      router.push(`/trainer/${path}` as const);
    }
  };

  return (
    <View style={styles.container}>
      <FooterButton title="Dashboard" onPress={() => navigate("dashboard")} />
      <FooterButton title="Clients" onPress={() => navigate("clients")} />
      <FooterButton title="Schedule" onPress={() => navigate("schedule")} />
    </View>
  );
}

function FooterButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 12,
  },
  button: {
    flex: 1,
    alignItems: "center",
  },
  text: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
