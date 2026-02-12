import AnimatedAppear from "@/src/components/AnimatedAppear";
import { colors } from "@/src/theme/colors";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Easing } from "react-native-reanimated";

function normalizeParam(label: string, value?: string | string[]) {
  console.log(`🔎 PARAM [${label}] RAW →`, value, typeof value);

  if (!value) return undefined;
  if (Array.isArray(value)) {
    console.log(`⚠️ PARAM [${label}] was array, using first element`);
    return value[0];
  }
  return value;
}

export default function TrainerDashboard() {

  
  const params = useLocalSearchParams();
  function fixFirebaseUrl(url?: string) {
    if (!url) return undefined;

    try {
      const [base, query] = url.split("?");

      if (!base.includes("/o/")) return url;

      const [prefix, objectPath] = base.split("/o/");

      // 🔒 Re-encode ONLY the storage object path
      const encodedPath = encodeURIComponent(objectPath);

      return `${prefix}/o/${encodedPath}${query ? `?${query}` : ""}`;
    } catch {
      return url;
    }
  }
  console.log("🧪 RAW PARAMS OBJECT:", params);

  const firstName = normalizeParam("firstName", params.firstName) ?? "Trainer";
  const lastName = normalizeParam("lastName", params.lastName) ?? "";
  const bio = normalizeParam("bio", params.bio);
  const rawProfilePicture = params.profilePicture as string | undefined;
  const rawCoverImage = params.coverImage as string | undefined;

  const profilePicture = fixFirebaseUrl(rawProfilePicture);
  const coverImage = fixFirebaseUrl(rawCoverImage);

  const [activeImage, setActiveImage] = useState<"cover" | "avatar" | null>(
    null
  );

  const viewerOpacity = useRef(new Animated.Value(0)).current;
  const viewerScale = useRef(new Animated.Value(0.95)).current;
  const coverOpacity = useRef(new Animated.Value(0)).current;
  const avatarOpacity = useRef(new Animated.Value(0)).current;
  const viewerTranslateY = useRef(new Animated.Value(10)).current;
  const openViewer = (type: "cover" | "avatar") => {
    setActiveImage(type);

    viewerOpacity.setValue(0);
    viewerScale.setValue(0.92);
    viewerTranslateY.setValue(10);

    Animated.parallel([
      Animated.timing(viewerOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(viewerScale, {
        toValue: 1,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.spring(viewerTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeViewer = () => {
    Animated.parallel([
      Animated.timing(viewerOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(viewerScale, {
        toValue: 0.92,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(viewerTranslateY, {
        toValue: 10,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveImage(null);
    });
  };

  console.log("🧾 FINAL VALUES", {
    firstName,
    lastName,
    bio,
    profilePicture,
    coverImage,
  });

  const fadeIn = (opacity: Animated.Value, label: string) => {
    console.log(`🎞️ fadeIn triggered for ${label}`);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* COVER */}
      <View style={styles.coverWrap}>
        <Pressable disabled={!coverImage} onPress={() => openViewer("cover")}>
          <Animated.Image
            source={
              coverImage
                ? { uri: coverImage }
                : require("../../assets/images/avatar-placeholder.png")
            }
            style={[styles.cover, { opacity: coverOpacity }]}
            resizeMode="cover"
            onLoadStart={() => {
              console.log("📸 COVER load start");
              coverOpacity.setValue(0);
            }}
            onLoadEnd={() => {
              console.log("✅ COVER load end");
              fadeIn(coverOpacity, "cover");
            }}
            onError={(e) => {
              console.log("❌ COVER IMAGE ERROR", e.nativeEvent);
            }}
          />
        </Pressable>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatarInner}>
          <Pressable onPress={() => openViewer("avatar")}>
            <Animated.Image
              source={
                profilePicture
                  ? { uri: profilePicture }
                  : require("../../assets/images/avatar-placeholder.png")
              }
              style={[styles.avatar, { opacity: avatarOpacity }]}
              resizeMode="cover"
              onLoadStart={() => {
                console.log("📸 AVATAR load start");
                avatarOpacity.setValue(0);
              }}
              onLoadEnd={() => {
                console.log("✅ AVATAR load end");
                fadeIn(avatarOpacity, "avatar");
              }}
              onError={(e) => {
                console.log("❌ AVATAR IMAGE ERROR", e.nativeEvent);
              }}
            />
          </Pressable>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <AnimatedAppear delay={0}>
          <Text style={styles.name}>
            {firstName} {lastName}
          </Text>
        </AnimatedAppear>

        <AnimatedAppear delay={60}>
          <Text style={styles.handle}>Trainer</Text>
        </AnimatedAppear>

        <AnimatedAppear delay={120}>
          <View style={{ marginTop: 12 }}>
            {bio ? (
              <Text style={styles.bio}>{bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                This trainer hasn’t added a bio yet.
              </Text>
            )}
          </View>
        </AnimatedAppear>
      </View>
      {activeImage && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeViewer}>
          {/* DARK BACKDROP */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: "rgba(0,0,0,0.9)",
                opacity: viewerOpacity,
              },
            ]}
          />

          {/* IMAGE */}
          <Animated.Image
            source={
              activeImage === "cover"
                ? coverImage
                  ? { uri: coverImage }
                  : require("../../assets/images/avatar-placeholder.png")
                : profilePicture
                ? { uri: profilePicture }
                : require("../../assets/images/avatar-placeholder.png")
            }
            style={[
              styles.viewerImage,
              {
                transform: [
                  { scale: viewerScale},
                  //check this out later
                  { translateY: viewerTranslateY },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </Pressable>
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  coverWrap: { width: "100%", height: 160, backgroundColor: colors.card },
  cover: { width: "100%", height: 160 },
  avatarWrap: {
    position: "absolute",
    top: 110,
    left: 20,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.background,
  },
  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  viewerImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  content: { marginTop: 64, paddingHorizontal: 20 },
  name: { color: colors.textPrimary, fontSize: 22, fontWeight: "800" },
  handle: { color: colors.textSecondary, fontSize: 13, marginBottom: 12 },
  bio: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  bioPlaceholder: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
  },
});
