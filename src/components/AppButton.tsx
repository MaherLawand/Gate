import { useEffect, useRef } from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "small";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>; // 👈 ADD
  textStyle?: StyleProp<TextStyle>; // 👈 OPTIONAL (but smart)
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
}: Props) {
  const anim = useRef(new Animated.Value(disabled ? 0 : 1)).current;
  const pressDepth = useRef(new Animated.Value(0)).current;
  const onPressIn = () => {
    Animated.spring(pressDepth, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 220,
      damping: 18,
      mass: 0.6,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressDepth, {
      toValue: 0,
      useNativeDriver: true,
      stiffness: 220,
      damping: 18,
      mass: 0.6,
    }).start();
  };

  // useEffect(() => {
  //   Animated.timing(anim, {
  //     toValue: disabled ? 0 : 1,
  //     duration: 220,
  //     useNativeDriver: false, // color animation
  //   }).start();
  // }, [disabled]);

  //check this out later
  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: disabled ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    });

    animation.start();

    return () => {
      anim.stopAnimation();
    };
  }, [disabled, anim]);

  return (
    <AnimatedTouchable
  disabled={disabled}
  activeOpacity={1}
  onPress={onPress}
  onPressIn={onPressIn}
  onPressOut={onPressOut}
  style={[
    styles.buttonWrapper,
    {
      transform: [
        {
          translateY: pressDepth.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 4], // sink
          }),
        },
      ],
    },
    style,
  ]}
>
  {/* SHADOW BASE */}
  <Animated.View
    style={[
      styles.shadowBase,
      {
        opacity: pressDepth.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.4],
        }),
        backgroundColor: disabled ? "#3A3A3A" : "#b61823", // 👈 here
      },
    ]}
  />

  {/* BUTTON BODY */}
  <Animated.View
    style={[
      styles.buttonBody,
      {
        backgroundColor: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["#2A2A2A", "#ff0015"],
        }),
      },
    ]}
  >
    {/* SURFACE GRADIENT */}
    <View style={styles.surfaceHighlight} />

    <Text
      style={[
        styles.text,
        variant === "small" && styles.smallText,
        textStyle,
      ]}
    >
      {title}
    </Text>
  </Animated.View>
</AnimatedTouchable>

  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: "center",

    // 👇 3D FLOAT
    shadowColor: "#DE1F2E",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    shadowOpacity: 0.35,

    elevation: 10, // Android
  },

  text: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  

  // 👇 FOR EDIT / DELETE
  smallButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: 0, // ✅ KEY FIX
    borderRadius: 6,
  },

  smallText: {
    fontSize: 14,
    fontWeight: "600",
  },
  innerHighlight: {
    paddingVertical: 2,
    shadowColor: "rgba(255,255,255,0.4)",
    shadowOffset: { width: 0, height: -1 },
    shadowRadius: 2,
    shadowOpacity: 0.4,
  },
  buttonWrapper: {
    alignSelf: "stretch",
    marginTop: spacing.md,
  },
  shadowBase: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    height: "100%",
    borderRadius: 12,
  },
  buttonBody: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  
    // FLOAT SHADOW
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    shadowOpacity: 0.45,
  
    elevation: 14, // Android
  },
  surfaceHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
backgroundColor: "rgba(255,255,255,0.18)",
    opacity: 0.6,
  },

  
});
