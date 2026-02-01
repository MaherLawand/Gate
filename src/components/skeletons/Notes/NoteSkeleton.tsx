import AnimatedAppear from "@/src/components/AnimatedAppear";
import { colors } from "@/src/theme/colors";
import { StyleSheet, View } from "react-native";

type Props = {
  count?: number;
};

export default function NoteSkeleton({ count = 3 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <AnimatedAppear key={index} delay={index * 80}>
          <View style={styles.noteCard}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.skeletonLineSmall} />

              <View style={styles.iconRow}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonIcon} />
              </View>
            </View>

            {/* Content */}
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: "60%" }]} />
          </View>
        </AnimatedAppear>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  noteCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,

    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    // Android
    elevation: 4,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  skeletonLine: {
    height: 10,
    borderRadius: 6,
    backgroundColor: "#0b1220",
    marginBottom: 8,
  },

  skeletonLineSmall: {
    width: 120,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#0b1220",
  },

  iconRow: {
    flexDirection: "row",
    gap: 8,
  },

  skeletonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0b1220",
  },
});
