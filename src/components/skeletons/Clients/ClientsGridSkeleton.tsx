import { FlatList, View } from "react-native";
import ClientCardSkeleton from "./ClientCardSkeleton";

const SKELETON_ITEMS = Array.from({ length: 4 });

export default function ClientsGridSkeleton() {
  return (
    <FlatList
      data={SKELETON_ITEMS}
      keyExtractor={(_, i) => `skeleton-${i}`}
      renderItem={() => <ClientCardSkeleton />}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={{
        justifyContent: "space-between",
        marginBottom: 12,
      }}
      contentContainerStyle={{ marginTop: 16 }}
    />
  );
}