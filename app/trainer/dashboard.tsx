import { useFocusEffect  } from "expo-router";
import { Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";
import { useCallback } from "react";

import { useEffect } from "react";


export default function Dashboard() {



  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          "Exit app",
          "Are you sure you want to exit?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Exit", onPress: () => BackHandler.exitApp() },
          ]
        );
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trainer Dashboard</Text>
      <Text style={styles.text}>Clients • Notes • Schedule</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  text: {
    color: "#AAAAAA",
  },
});
