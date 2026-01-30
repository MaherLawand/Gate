import { useRouter, useSegments } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/colors";

type ClientRoute = "home" | "ClientWeeklyPreferencesScreen" | "Info";

export default function ClientFooter() {
  const router = useRouter();
  const segments = useSegments();

  const navigate = (path: ClientRoute) => {
    const current = segments[segments.length - 1];
    if (current !== path) {
      console.log(`Navigating to /client/${path}`);
      router.push(`/client/${path}` as const);
    }
  };

  return (
    <View style={styles.container}>
      <FooterButton title="home" onPress={() => navigate("home")} />
      <FooterButton title="Sessions" onPress={() => navigate("ClientWeeklyPreferencesScreen")} />
      <FooterButton title="Info" onPress={() => navigate("Info")} />
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
