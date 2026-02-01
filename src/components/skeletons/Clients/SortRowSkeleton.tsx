import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function SortRowSkeleton() {
  return (
    <View style={styles.row}>
      {[80, 60, 120, 100].map((w, i) => (
        <SkeletonBox key={i} width={w} height={32} borderRadius={20} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
});
