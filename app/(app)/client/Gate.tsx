import firestore from "@react-native-firebase/firestore";
import { setupNotifications } from "@/src/notifications/setupNotifications";
import { colors } from "@/src/theme/colors";

import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { collection } from "@/src/services/db";

/* ---------------- TYPES ---------------- */

type AdminTrainer = {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  profilePicture?: string;
  coverImage?: string;
};

/* ---------------- CONSTANTS ---------------- */

const IMAGE_HEIGHT = 280;
const SCREEN_WIDTH = Dimensions.get("window").width;

/* ---------------- COMPONENT ---------------- */

export default function TrainerHome() {
  const [admins, setAdmins] = useState<AdminTrainer[]>([]);
  const scrollY = useSharedValue(0);

  const navigation = useNavigation();

useEffect(() => {
  if (Platform.OS !== "ios") return;

  const unsub = navigation.addListener("beforeRemove", (e) => {
    const actionType = e.data.action.type;

    // Only block back-like actions
    if (actionType !== "GO_BACK") {
      return; // allow navigate/replace/etc
    }

    e.preventDefault();

    Alert.alert("Leave Gate?", "Are you sure you want to leave?", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => navigation.dispatch(e.data.action),
      },
    ]);
  });

  return unsub;
}, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          Alert.alert("Exit app", "Are you sure you want to exit?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Exit",
              style: "destructive",
              onPress: () => BackHandler.exitApp(),
            },
          ]);

          return true; // ⛔ block default back
        }
      );

      return () => subscription.remove();
    }, [])
  );

  /* -------- LOAD ADMIN TRAINERS -------- */

  useEffect(() => {
  const loadAdmins = async () => {
    const snap = await collection("users")
      .where("isAdmin", "==", true)
      .limit(2)
      .get();

    const data: AdminTrainer[] = snap.docs.map((doc:any) => {
      const d = doc.data();
      return {
        id: doc.id,
        firstName: d.firstName,
        lastName: d.lastName,
        bio: d.bio,
        profilePicture: d.profilePicture,
        coverImage: d.coverImage,
      };
    });

    setAdmins(data);
  };

  loadAdmins();
}, []);

  useEffect(() => {
    setupNotifications();
  }, []);

  /* -------- SCROLL -------- */

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  /* -------- PARALLAX -------- */

  const createParallaxStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const relativeY = scrollY.value - offset;

      const translateY = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [-60, 0, 60],
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [1.05, 1, 1.2],
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateY }, { scale }],
      };
    });

  const imageStyle1 = createParallaxStyle(0);
  const imageStyle2 = createParallaxStyle(IMAGE_HEIGHT + 240);

  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Trainer Home</Text>
        <Text style={styles.subtitle}>Your personal training dashboard</Text>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* IMAGE 1 */}
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{
              uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
            }}
            style={[styles.image, imageStyle1]}
            resizeMode="cover"
          />
        </View>

        {/* CONTENT 1 */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Training Space</Text>
          <Text style={styles.text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </Text>
          <Text style={styles.text}>
            Duis aute irure dolor in reprehenderit in voluptate.
          </Text>
        </View>

        {/* IMAGE 2 */}
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{
              uri: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
            }}
            style={[styles.image, imageStyle2]}
            resizeMode="cover"
          />
        </View>

        {/* FEATURED COACHES */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Featured Coaches</Text>

          <View style={styles.cardsRow}>
            {admins.map((trainer) => {
              const fullName = `${trainer.firstName} ${trainer.lastName}`;

              return (
                <Pressable
                  key={trainer.id}
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: "/client/Trainer",
                      params: {
                        firstName: trainer.firstName,
                        lastName: trainer.lastName,
                        bio: trainer.bio ?? "",
                        profilePicture: trainer.profilePicture ?? "",
                        coverImage: trainer.coverImage ?? "",
                      },
                    })
                  }
                >
                  {/* COVER */}
                  <Image
                    source={{
                      uri:
                        trainer.coverImage ??
                        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
                    }}
                    style={styles.cardCover}
                  />

                  {/* OVERLAY */}
                  <View style={styles.cardOverlay} />

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <Image
                      source={{
                        uri:
                          trainer.profilePicture ??
                          `https://ui-avatars.com/api/?background=111&color=fff&name=${encodeURIComponent(
                            fullName
                          )}`,
                      }}
                      style={styles.avatar}
                    />
                    <Text style={styles.cardTitle}>{fullName}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },

  imageWrapper: {
    height: IMAGE_HEIGHT,
    overflow: "hidden",
  },

  image: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },

  content: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 10,
  },

  cardsRow: {
    gap: 16,
  },

  card: {
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
  },

  cardCover: {
    ...StyleSheet.absoluteFillObject,
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  cardContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#fff",
    marginBottom: 8,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
