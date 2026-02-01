// src/components/skeletons/ScheduleTimeColumnSkeleton.tsx
import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const MINUTE_HEIGHT = 2;

const slots = Array.from(
  { length: ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES },
  (_, i) => i
);

export default function ScheduleTimeColumnSkeleton() {
  return (
    <View style={styles.column}>
      {slots.map((_, i) => (
        <SkeletonBox
          key={i}
          width={44}
          height={SLOT_MINUTES * MINUTE_HEIGHT - 30}
          borderRadius={6}
          style={{ marginBottom: 25 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 60,
    paddingRight: 8,
  },
});
