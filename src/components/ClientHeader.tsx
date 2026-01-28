import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export default function ClientHeader() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Notifications Icon */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.iconWrapper}
      >
        <Ionicons name="notifications-outline" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Profile Icon */}
      <TouchableOpacity
        onPress={() => router.replace("/client/client-profile")}
        style={styles.iconWrapper}
      >
        <Ionicons name="person-circle-outline" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Notifications Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <Text style={styles.modalText}>
              Booking reminder from Trainer John
            </Text>
            <Text style={styles.modalText}>New message from Trainer Sarah</Text>

            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 12,
    gap: 16,
    backgroundColor: colors.background,
  },
  iconWrapper: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  modalText: {
    color: colors.white,
    fontSize: 16,
    marginBottom: 12,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});
