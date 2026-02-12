import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { listenUnreadNotificationsCount } from "../services/notifications/notificationService";
import { colors } from "../theme/colors";
import { useClient } from "./ClientContext";

type ClientNotification = {
  id: string;
  title: string;
  body: string;
  route?: string;
  params?: Record<string, any>;
  read: boolean;
  createdAt: any;
};

export default function AppHeader() {
  const router = useRouter();
  const clientCtx = useClient();
  const clientId = clientCtx?.clientId;
  const isClient = Boolean(clientId);

  const [unreadCount, setUnreadCount] = useState(0);
  const [openMenu, setOpenMenu] = useState<"account" | "notifications" | null>(
    null
  );
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);

  /* ---------------- LOAD CLIENT NOTIFICATIONS ---------------- */
  useEffect(() => {
    if (!clientId) {
      setNotifications([]);
      return;
    }

    const unsub = firestore()
      .collection("clients")
      .doc(clientId)
      .collection("notifications")
      .where("read", "==", false)
      .where("sent", "==", true)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          if (!snap) {
            console.warn("[Notifications] snapshot is null");
            setNotifications([]);
            return;
          }

          const data = snap.docs
            .map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }))
            .filter((n) => n.type !== "announcement");

          setNotifications(data);
        },
        (error) => {
          console.error("[Notifications] listener error", error);
          setNotifications([]);
        }
      );

    return () => unsub();
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;

    const unsub = listenUnreadNotificationsCount(clientId, setUnreadCount);
    return unsub;
  }, [clientId]);

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    await auth().signOut();
    router.replace("/");
  };

  const markAsRead = async (notificationId: string) => {
    if (!clientId) return;

    await firestore()
      .collection("clients")
      .doc(clientId)
      .collection("notifications")
      .doc(notificationId)
      .update({ read: true });
  };

  const formatNotificationDate = (createdAt: any) => {
    if (!createdAt) return "";

    const date =
      typeof createdAt.toDate === "function"
        ? createdAt.toDate()
        : new Date(createdAt);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  /* ---------------- HEADER ---------------- */
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.logo}> </Text>
        <View style={styles.rightIcons}>
          {/* 🔔 NOTIFICATIONS (CLIENT ONLY) */}
          {isClient && (
            <TouchableOpacity
              onPress={() => {
                setOpenMenu("notifications");
              }}
              style={{ position: "relative" }}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          {/* 👤 ACCOUNT */}
          <TouchableOpacity
            onPress={() => {
              setOpenMenu("account");
            }}
          >
            <Ionicons name="person-circle-outline" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= OVERLAY ================= */}
      {openMenu && (
        <Pressable style={styles.overlay} onPress={() => setOpenMenu(null)}>
          {/* ================= NOTIFICATIONS MENU ================= */}
          {openMenu === "notifications" && (
            <Pressable style={styles.menuWide} 
             onPress={() => {}}>
              {notifications.length === 0 && (
                <Text style={styles.emptyText}>No notifications yet</Text>
              )}
              <ScrollView keyboardShouldPersistTaps="handled">
                {notifications.map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.notificationRow,
                      !n.read && styles.unreadRow,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.notificationContent}
                      onPress={async () => {
                        setOpenMenu(null);

                        if (!n.read) {
                          await markAsRead(n.id);
                        }

                        if (n.route) {
                          router.push({
                            pathname: n.route as any,
                            params: n.params ?? {},
                          });
                        }
                      }}
                    >
                      <View style={styles.notificationHeader}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            !n.read && styles.unread,
                          ]}
                        >
                          {n.title}
                        </Text>

                        <Text style={styles.notificationDate}>
                          {formatNotificationDate(n.createdAt)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.notificationBody,
                          !n.read && styles.notificationBodyUnread,
                        ]}
                      >
                        {n.body}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.trashIcon}
                      onPress={() => markAsRead(n.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          )}

          {/* ================= ACCOUNT MENU ================= */}
          {openMenu === "account" && (
            <Pressable style={styles.menu} onPress={() => {}}>
              {isClient && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setOpenMenu(null);
                    router.push("/profile");
                  }}
                >
                  <Text style={styles.menuText}>Account</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Text style={[styles.menuText, { color: colors.primary }]}>
                  Sign out
                </Text>
              </TouchableOpacity>
            </Pressable>
          )}
        </Pressable>
      )}
    </>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  unreadRow: {
    backgroundColor: "rgba(59,130,246,0.08)", // subtle blue tint
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
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
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  overlay: {
    //check this out later
    ...StyleSheet.absoluteFillObject,
   // position: "absolute",
   // top: 0,
    //left: 0,
   // right: 0,
    //bottom: 0,
    backgroundColor: "transparent",
    zIndex: 50,
  },
  /* ACCOUNT MENU */
  menu: {
    position: "absolute",
    top: 56,
    right: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    width: 180,
    elevation: 6,
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
  /* NOTIFICATIONS MENU */
  menuWide: {
    position: "absolute",
    top: 56,
    right: 16,
    width: 320,
    maxHeight: 360,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 8,
    elevation: 8,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  notificationBodyUnread: {
    color: colors.textPrimary,
  },
  unread: {
    fontWeight: "700",
    color: colors.primary,
  },
  notificationBody: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    padding: 20,
    textAlign: "center",
    color: colors.textSecondary,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  trashIcon: {
    padding: 8,
    marginLeft: 8,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  notificationDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
