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
  TouchableOpacity,
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
import { Ionicons } from "@expo/vector-icons";
import AnimatedAppear from "@/src/components/AnimatedAppear";

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
  const [images, setImages] = useState<string[] | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
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
        },
      );

      return () => subscription.remove();
    }, []),
  );

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const snap = await firestore()
          .collection("app_content")
          .doc("gate_home")
          .get();

        if (snap.exists()) {
          const data = snap.data();
          if (data?.images && Array.isArray(data.images)) {
            setImages(data.images);
          }
        }
      } catch (e) {
        console.log("Failed to load home images:", e);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, []);
  /* -------- LOAD ADMIN TRAINERS -------- */

  useEffect(() => {
    const loadAdmins = async () => {
      const snap = await collection("users")
        .where("isAdmin", "==", true)
        .limit(2)
        .get();

      const data: AdminTrainer[] = snap.docs.map((doc: any) => {
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

  // /* -------- SCROLL -------- */

  // const scrollHandler = useAnimatedScrollHandler({
  //   onScroll: (event) => {
  //     scrollY.value = event.contentOffset.y;
  //   },
  // });

  /* -------- PARALLAX -------- */

  const createParallaxStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const relativeY = scrollY.value - offset;

      const translateY = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [-60, 0, 60],
        Extrapolation.CLAMP,
      );

      const scale = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [1.05, 1, 1.2],
        Extrapolation.CLAMP,
      );

      return {
        transform: [{ translateY }, { scale }],
      };
    });

  const imageStyle1 = createParallaxStyle(0);
  const imageStyle2 = createParallaxStyle(IMAGE_HEIGHT + 240);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [secondY, setSecondY] = useState(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  const snapPoint = IMAGE_HEIGHT;

  const snapProgress = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [snapPoint - 30, snapPoint],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return { opacity: progress };
  });
  const scrollOpacity = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [snapPoint - 30, snapPoint],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity: progress };
  });
  /* ---------------- RENDER ---------------- */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Text style={styles.title}>Gate Private Gym</Text>
        <Text style={styles.text}>
          Welcome to <Text style={styles.highlight}>Gate</Text> — a private
          training space built on <Text style={styles.bold}>discipline</Text>,{" "}
          <Text style={styles.bold}>trust</Text>, and{" "}
          <Text style={styles.bold}>real results</Text>.
        </Text>
      </View>
      <AnimatedAppear
  delay={120}
  style={{
    position: "absolute",
    top: 24,
    right: 20,
  }}
>
  <TouchableOpacity
    onPress={() => router.push("/(app)/client/announcements")}
    style={{
      backgroundColor: colors.card,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    }}
  >
    <Ionicons
      name="megaphone-outline"
      size={20}
      color={colors.primary}
      backgroundColor="transparent"
    />
  </TouchableOpacity>
</AnimatedAppear>
      <Animated.View
        style={[
          styles.fixedSecondParagraph,
          { top: headerHeight },
          snapProgress,
        ]}
      >
        <Text style={styles.text}>
          We’re more than a gym. We’re a{" "}
          <Text style={styles.bold}>tight community</Text> where every member is{" "}
          <Text style={styles.bold}>known</Text>,{" "}
          <Text style={styles.bold}>supported</Text>, and pushed to{" "}
          <Text style={styles.highlight}>grow</Text>.
        </Text>
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* IMAGE 1 */}
        <View style={styles.imageWrapper}>
          {loadingImages || !images?.[0] ? (
            <View style={styles.imageSkeleton} />
          ) : (
            <Animated.Image
              source={{ uri: images[0] }}
              style={[styles.image, imageStyle1]}
              resizeMode="cover"
            />
          )}
        </View>

        {/* CONTENT 1 */}
        <Animated.View style={scrollOpacity}>
          <View
            style={styles.secondParagraphContainer}
            onLayout={(e) => {
              setSecondY(e.nativeEvent.layout.y);
            }}
          >
            <Text style={styles.text}>
              We’re more than a gym. We’re a{" "}
              <Text style={styles.bold}>tight community</Text> where every
              member is <Text style={styles.bold}>known</Text>,{" "}
              <Text style={styles.bold}>supported</Text>, and pushed to{" "}
              <Text style={styles.highlight}>grow</Text>.
            </Text>
          </View>
        </Animated.View>

        {/* IMAGE 2 */}
        <View style={styles.imageWrapper}>
          {loadingImages || !images?.[1] ? (
            <View style={styles.imageSkeleton} />
          ) : (
            <Animated.Image
              source={{ uri: images[1] }}
              style={[styles.image, imageStyle2]}
              resizeMode="cover"
            />
          )}
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
                  <View style={styles.cardCoverWrapper}>
                    {/* {!imageLoaded && <View style={styles.imageSkeleton} />} */}

                    {/* COVER */}
                    <View style={styles.cardCoverWrapper}>
                      {trainer.coverImage &&
                      trainer.coverImage.startsWith("http") ? (
                        <Image
                          source={{ uri: trainer.coverImage }}
                          style={styles.cardCover}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.coverFallback}>
                          <Image
                            source={require("../../../assets/images/gate-logo.png")}
                            style={styles.coverLogo}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* OVERLAY */}
                  <View style={styles.cardOverlay} />

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <View style={styles.profileRow}>
                      <Image
                        source={
                          trainer.profilePicture &&
                          trainer.profilePicture.startsWith("http")
                            ? { uri: trainer.profilePicture }
                            : require("../../../assets/images/icons8-profile-96.png")
                        }
                        style={styles.avatar}
                      />

                      <Text style={styles.trainerName}>{fullName}</Text>
                    </View>
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
  position: "relative", // 👈 ADD THIS
},

  title: {
    fontSize: 23,
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
    color: colors.textPrimary,
    marginBottom: 10,
  },
  cardsRow: {
    gap: 16,
  },

  card: {
    position: "relative",
    borderRadius: 18,
    overflow: "visible",
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
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  imageSkeleton: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.card,
    opacity: 0.6,
  },
  cardCoverWrapper: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0B0F14", // your premium dark background
    justifyContent: "center",
    alignItems: "center",
  },

  coverLogo: {
    width: 80,
    height: 80,
    opacity: 0.8, // subtle, not too loud
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  trainerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  fixedSecondParagraph: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
    zIndex: 20,
  },
  secondParagraphContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  highlight: {
    color: colors.primary, // your red brand color
    fontWeight: "800",
  },

  bold: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
