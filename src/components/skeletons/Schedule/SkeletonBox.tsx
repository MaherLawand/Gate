// src/components/skeletons/SkeletonBox.tsx
import { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

type Props = {
  width?: number | `${number}%`; // ✅ correct
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>; // ✅ allows arrays + animated
};

export default function SkeletonBox({
  width = "100%",
  height,
  borderRadius = 8,
  style,
}: Props) {
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
    outputRange: [0.45, 0.8],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#3A3A3A",
          opacity,
        },
        style,
      ]}
    />
  );
}
