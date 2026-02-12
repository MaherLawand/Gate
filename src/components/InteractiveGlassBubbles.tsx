import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import type { ColorValue } from "react-native";
import { StyleSheet } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

export function VenomBubble({
  size,
  baseX,
  baseY,
  colors,
  impulseX,
  impulseY,
  strength,
}: {
  size: number;
  baseX: number;
  baseY: number;
  colors: GradientColors;
  impulseX: SharedValue<number>;
  impulseY: SharedValue<number>;

  strength: number;
}) {
  const wobble = useSharedValue(0);
  const wobble2 = useSharedValue(0);

  useEffect(() => {
    wobble.value = withRepeat(withTiming(1, { duration: 9000 }), -1, true);
    wobble2.value = withRepeat(withTiming(1, { duration: 13000 }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => {
    const w1 = Math.sin(wobble.value * Math.PI * 2) * 12;
    const w2 = Math.cos(wobble2.value * Math.PI * 2) * 10;

    return {
      transform: [
        { translateX: baseX + w1 + impulseX.value * strength },
        { translateY: baseY + w2 + impulseY.value * strength },
        { scale: 1 + Math.sin(wobble.value * Math.PI) * 0.035 },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.venomBubble, { width: size, height: size }, style]}
    >
      {/* Core glow */}
      <LinearGradient
        colors={colors}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Edge distortion layers */}
      <LinearGradient
        colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0)"]}
        start={{ x: 0.1, y: 0.4 }}
        end={{ x: 0.9, y: 0.6 }}
        style={styles.edgeLayer}
      />

      <LinearGradient
        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0)"]}
        start={{ x: 0.6, y: 0.2 }}
        end={{ x: 0.4, y: 0.8 }}
        style={styles.edgeLayer}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  venomBubble: {
    position: "absolute",
    borderRadius: 999,
    overflow: "hidden",
  },
  edgeLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
});
