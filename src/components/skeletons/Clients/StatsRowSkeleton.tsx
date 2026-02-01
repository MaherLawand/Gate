import { colors } from "@/src/theme/colors";
import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function StatsRowSkeleton() {
  return (
    <View style={styles.row}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.card}>
          {/* Big number */}
          <SkeletonBox width={40} height={22} borderRadius={6} />

          {/* Label */}
          <SkeletonBox
            width={60}
            height={12}
            borderRadius={6}
            style={{ marginTop: 6 }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
});
