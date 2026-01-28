import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "small";
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
}: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "small" && styles.smallButton,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.text,
          variant === "small" && styles.smallText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
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

