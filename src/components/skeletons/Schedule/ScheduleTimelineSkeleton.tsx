// src/components/skeletons/ScheduleTimelineSkeleton.tsx

import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

const DAY_HEIGHT = (21 - 7) * 60 * 2;

function SessionSkeleton({
  top,
  width,
  height,
}: {
  top: number;
  width: `${number}%`;
  height: number;
}) {
  return (
    <View style={[styles.block, { top, width }]}>
      <View style={[styles.card, { minHeight: height }]}>
        {/* Client name */}
        <SkeletonBox
          width="60%"
          height={12}
          borderRadius={6}
          style={{ marginBottom: 8 }}
        />

        {/* Time */}
        <SkeletonBox
          width="45%"
          height={12}
          borderRadius={6}
          style={{ marginBottom: 12 }}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <SkeletonBox width={22} height={22} borderRadius={6} />
          <SkeletonBox width={22} height={22} borderRadius={6} />
          <SkeletonBox width={22} height={22} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

export default function ScheduleTimelineSkeleton() {
  return (
    <View style={styles.container}>
      <SessionSkeleton top={20} width="80%" height={70} />
      <SessionSkeleton top={160} width="80%" height={90} />
      <SessionSkeleton top={300} width="80%" height={70} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: DAY_HEIGHT,
    position: "relative",
  },

  block: {
    position: "absolute",
    left: 10,
  },

  card: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#242424", // neutral skeleton background
    justifyContent: "space-between",
  },

  actions: {
    flexDirection: "row",
    columnGap: 8, // safer than gap
  },
});
