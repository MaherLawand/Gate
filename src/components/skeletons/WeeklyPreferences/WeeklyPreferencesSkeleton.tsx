import { colors } from "@/src/theme/colors";
import { StyleSheet, View } from "react-native";
import SkeletonBox from "../Clients/SkeletonBox";

const DAY_COUNT = 5;
const HOURS_PER_DAY = 6;

export default function WeeklyPreferencesSkeleton() {
  return (
    <View style={styles.container}>
      {/* Title */}
      <SkeletonBox width={220} height={22} borderRadius={6} />
      <SkeletonBox
        width={260}
        height={14}
        borderRadius={6}
        style={{ marginTop: 8 }}
      />

      {/* Info */}
      <SkeletonBox
        width={180}
        height={14}
        borderRadius={6}
        style={{ marginTop: 16 }}
      />

      {/* Days */}
      <View style={{ marginTop: 20 }}>
        {Array.from({ length: DAY_COUNT }).map((_, i) => (
          <View key={i} style={styles.dayCard}>
            {/* Day header */}
            <View style={styles.dayHeader}>
              <SkeletonBox width={90} height={16} borderRadius={6} />
              <SkeletonBox width={70} height={12} borderRadius={6} />
            </View>
          </View>
        ))}
      </View>

      {/* Save button */}
      <SkeletonBox
        width="100%"
        height={46}
        borderRadius={10}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  dayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  hoursRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
});
