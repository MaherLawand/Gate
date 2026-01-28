import Header from "@/src/components/AppHeader";
import { Alert, BackHandler, StyleSheet, Text, View } from "react-native";
import Screen from "../../src/components/Screen";
import { useCallback, useEffect } from "react";
import { useFocusEffect } from "expo-router";

export default function ClientHome() {
  
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
    <Screen>
      <Header />
      <View style={styles.container}>
        <Text style={styles.text}>Welcome to your gym app 💪</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050608",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});
