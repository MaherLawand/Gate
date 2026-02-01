import { colors } from "@/src/theme/colors";
import { StyleSheet, View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function SearchInputSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBox width="100%" height={44} borderRadius={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 16,
  },
});
