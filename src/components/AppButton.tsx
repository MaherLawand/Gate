import { useEffect, useRef } from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
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

  useEffect(() => {
    Animated.timing(anim, {
      toValue: disabled ? 0 : 1,
      duration: 220,
      useNativeDriver: false, // color animation
    }).start();
  }, [disabled]);

  return (
    <AnimatedTouchable
      disabled={disabled}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.button,
        variant === "small" && styles.smallButton,
        {
          opacity: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 1],
          }),
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ["#2A2A2A", colors.primary],
          }),
        },
        style, // 👈 MUST BE LAST
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === "small" && styles.smallText,
          textStyle, // 👈 optional override
        ]}
      >
        {title}
      </Text>
    </AnimatedTouchable>
  );
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg, // ✅ ADD THIS
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.sm,
  },

  text: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
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
});
