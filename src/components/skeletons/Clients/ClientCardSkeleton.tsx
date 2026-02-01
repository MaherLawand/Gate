import { colors } from "@/src/theme/colors";
import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function ClientCardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Client name */}
      <SkeletonBox width="70%" height={18} borderRadius={6} />

      {/* Phone */}
      <SkeletonBox
        width="60%"
        height={14}
        borderRadius={6}
        style={{ marginTop: 6 }}
      />

      {/* Warning / inactive text */}
      <SkeletonBox
        width="80%"
        height={14}
        borderRadius={6}
        style={{ marginTop: 10 }}
      />

      {/* Button (Unarchive) */}
      <SkeletonBox
        width="50%"
        height={36}
        borderRadius={18}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
