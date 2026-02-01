import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import auth from "@react-native-firebase/auth";
import { useRouter } from "expo-router";

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await auth().signOut();
    router.replace("/");
  };

  return (
    <>
      {/* HEADER BAR */}
      <View style={styles.header}>
        <Text style={styles.logo}>Gate</Text>

        <TouchableOpacity onPress={() => setOpen(true)}>
          <Ionicons name="person-circle-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* OVERLAY */}
      {open && (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          {/* MENU */}
          <Pressable style={styles.menu} onPress={() => {}}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOpen(false);
                router.push("/profile");
              }}
            >
              <Text style={styles.menuText}>Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <Text style={[styles.menuText, { color: colors.primary }]}>
                Sign out
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
    /* ===== HEADER ===== */
    header: {
      height: 56,
      backgroundColor: colors.background,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 20,
    },
  
    logo: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
  
    /* ===== OVERLAY ===== */
    overlay: {
      position: "absolute",
      top: 30,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent", // invisible but clickable
      zIndex: 40,
    },
  
    /* ===== MENU ===== */
    menu: {
      position: "absolute",
      top: 56, // directly under header
      right: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 8,
      width: 180,
  
      // Android shadow
      elevation: 6,
  
      // iOS shadow
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
  
    menuItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  
    menuText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "500",
    },
  });
  
