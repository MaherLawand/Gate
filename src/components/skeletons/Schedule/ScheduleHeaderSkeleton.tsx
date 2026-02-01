// src/components/skeletons/ScheduleHeaderSkeleton.tsx
import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function ScheduleHeaderSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox width={160} height={22} borderRadius={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
});
