import { View } from "react-native";

export default function ScheduleSessionSkeleton({
  top,
  height,
}: {
  top: number;
  height: number;
}) {
  return (
    <View
      style={{
        position: "absolute",
        top,
        left: 10,
        right: 10,
        height,
        backgroundColor: "#151515",
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: "#333",
        padding: 10,
      }}
    >
      <View
        style={{
          width: "60%",
          height: 12,
          backgroundColor: "#2a2a2a",
          borderRadius: 6,
          marginBottom: 6,
        }}
      />
      <View
        style={{
          width: "40%",
          height: 10,
          backgroundColor: "#2a2a2a",
          borderRadius: 6,
        }}
      />
    </View>
  );
}