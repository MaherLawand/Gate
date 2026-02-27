import { useEffect, useState } from "react";
import { useClient } from "@/src/components/ClientContext";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Modal,
  Dimensions,
} from "react-native";
import firestore from "@react-native-firebase/firestore";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import AnimatedAppear from "@/src/components/AnimatedAppear";

type Announcement = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  createdAt?: any;
  expiresAt?: any;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const clientCtx = useClient();
const clientId = clientCtx?.clientId;
useEffect(() => {
  if (!clientId) return;

  const markAnnouncementsAsRead = async () => {
    const snap = await firestore()
      .collection("clients")
      .doc(clientId)
      .collection("notifications")
      .where("type", "==", "announcement")
      .where("read", "==", false)
      .get();

    const batch = firestore().batch();

    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  };

  markAnnouncementsAsRead();
}, [clientId]);
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await firestore()
          .collection("announcements")
          .orderBy("createdAt", "desc")
          .get();

        const now = new Date();

        const valid = snap.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          }))
          .filter((a) => {
            if (!a.expiresAt) return true;
            return a.expiresAt.toDate() > now;
          });

        setAnnouncements(valid);

        // Pre-calc image ratios
        valid.forEach((a) => {
          if (a.imageUrl) {
            Image.getSize(a.imageUrl, (w, h) => {
              setImageRatios((prev) => ({
                ...prev,
                [a.id]: w / h,
              }));
            });
          }
        });
      } catch (e) {
        console.log("Failed to load announcements:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const d = timestamp.toDate();
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.title, styles.header]}>
          Announcements
        </Text>

        {announcements.map((a, index) => (
          <AnimatedAppear key={a.id} delay={index * 80}>
            <View style={styles.card}>
              {/* HEADER ROW */}
              <View style={styles.cardHeader}>
                <Image
                  source={require("../../../assets/images/gate-logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.dateText}>
                  Posted {formatDate(a.createdAt)}
                </Text>
              </View>

              <Text style={[typography.title, styles.title]}>
                {a.title}
              </Text>

              <Text style={[typography.body, styles.body]}>
                {a.body}
              </Text>

              {/* IMAGE */}
              {a.imageUrl && imageRatios[a.id] && (
                <Pressable onPress={() => setExpandedImage(a.imageUrl!)}>
                  <Image
                    source={{ uri: a.imageUrl }}
                    style={{
                      width: "100%",
                      aspectRatio: imageRatios[a.id],
                      borderRadius: 14,
                      marginTop: 14,
                    }}
                    resizeMode="cover"
                  />
                </Pressable>
              )}
            </View>
          </AnimatedAppear>
        ))}
      </ScrollView>

      {/* FULLSCREEN MODAL */}
      <Modal visible={!!expandedImage} transparent>
        <Pressable
          style={styles.modalContainer}
          onPress={() => setExpandedImage(null)}
        >
          {expandedImage && (
            <Image
              source={{ uri: expandedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    color: colors.textPrimary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: {
    width: 36,
    height: 36,
  },
  dateText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    marginBottom: 6,
  },
  body: {
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: "90%",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});