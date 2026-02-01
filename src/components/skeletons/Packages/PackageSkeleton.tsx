import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../../../theme/colors";

export default function PackageSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.6],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.lineLg, { opacity }]} />
      <Animated.View style={[styles.lineSm, { opacity }]} />
      <Animated.View style={[styles.lineSm, { opacity }]} />

      <View style={styles.tagRow}>
        <Animated.View style={[styles.pill, { opacity }]} />
        <Animated.View style={[styles.pill, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },

  lineLg: {
    height: 16,
    width: "70%",
    borderRadius: 8,
    backgroundColor: "#1f2937",
    marginBottom: 12,
  },

  lineSm: {
    height: 14,
    width: "50%",
    borderRadius: 8,
    backgroundColor: "#1f2937",
    marginBottom: 10,
  },

  tagRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  pill: {
    height: 26,
    width: 80,
    borderRadius: 999,
    backgroundColor: "#111827",
  },
});
