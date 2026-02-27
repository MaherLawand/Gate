import { colors } from "@/src/theme/colors";
import { Dimensions, Platform, StyleSheet, Text, View, BackHandler } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";

const IMAGE_HEIGHT = 280;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function TrainerHome() {
    // useFocusEffect(
    //   useCallback(() => {
    //     const onBack = () => {
    //       router.replace("/(app)/trainer/dashboard");
    //       return true; // ⛔ block default back
    //     };
  
    //     // Android hardware back
    //     const sub =
    //       Platform.OS === "android"
    //         ? BackHandler.addEventListener("hardwareBackPress", onBack)
    //         : null;
  
    //     return () => {
    //       sub?.remove();
    //     };
    //   }, [])
    // );
  
    // const navigation = useNavigation();
  
    // useEffect(() => {
    //   if (Platform.OS !== "ios") return;
  
    //   const unsub = navigation.addListener("beforeRemove", (e) => {
    //     // Allow programmatic redirects
    //     if (e.data.action?.type === "REPLACE") return;
  
    //     e.preventDefault();
  
    //     router.replace("/(app)/trainer/dashboard");
    //   });
  
    //   return unsub;
    // }, [navigation]);
  const [images, setImages] = useState<string[] | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/(app)/trainer/dashboard");
        return true;
      };

      const sub =
        Platform.OS === "android"
          ? BackHandler.addEventListener("hardwareBackPress", onBack)
          : null;

      return () => sub?.remove();
    }, [])
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
        console.log("Failed to load images:", e);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, []);

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
      Extrapolation.CLAMP
    );

    return { opacity: progress };
  });

  const scrollOpacity = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [snapPoint - 30, snapPoint],
      [1, 0],
      Extrapolation.CLAMP
    );

    return { opacity: progress };
  });

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
  const imageStyle2 = createParallaxStyle(IMAGE_HEIGHT + 200);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={styles.header}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Text style={styles.title}>Gate Private Gym</Text>
        <Text style={styles.text}>
          Welcome to <Text style={styles.highlight}>Gate</Text> — built on{" "}
          <Text style={styles.bold}>discipline</Text>,{" "}
          <Text style={styles.bold}>trust</Text>, and{" "}
          <Text style={styles.bold}>real results</Text>.
        </Text>
      </View>

      {/* Fixed snapping paragraph */}
      <Animated.View
        style={[
          styles.fixedSecondParagraph,
          { top: headerHeight },
          snapProgress,
        ]}
      >
        <Text style={styles.text}>
  Manage your <Text style={styles.bold}>clients</Text>, track{" "}
  <Text style={styles.bold}>progress</Text>, and lead with{" "}
  <Text style={styles.highlight}>discipline</Text>.  

  {"\n\n"}

  Plan smarter sessions, monitor performance closely
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

        {/* Scrolling paragraph */}
        <Animated.View style={scrollOpacity}>
          <View style={styles.secondParagraphContainer}>
            <Text style={styles.text}>
  Manage your <Text style={styles.bold}>clients</Text>, track{" "}
  <Text style={styles.bold}>progress</Text>, and lead with{" "}
  <Text style={styles.highlight}>discipline</Text>.  

  {"\n\n"}

  Plan smarter sessions, monitor performance closely
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
        <View style={styles.contentBlock}>
  <Text style={styles.sectionTitle}>Your Role at Gate</Text>

  <Text style={styles.text}>
    As a <Text style={styles.highlight}>Gate Trainer</Text>, you are more than a coach.
    You are a leader of <Text style={styles.bold}>discipline</Text>, 
    a driver of <Text style={styles.bold}>progress</Text>, 
    and the standard of <Text style={styles.highlight}>excellence</Text>.
  </Text>

  <Text style={styles.text}>
    Every client session shapes the culture. Every decision builds trust.
  </Text>
</View>
      </Animated.ScrollView>
    </View>
  );
}

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

  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 10,
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

  imageSkeleton: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.card,
    opacity: 0.6,
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
    color: colors.primary,
    fontWeight: "800",
  },

  bold: {
    fontWeight: "700",
    color: colors.textPrimary,
  },
  contentBlock: {
  paddingHorizontal: 20,
  paddingVertical: 40,
},

sectionTitle: {
  fontSize: 20,
  fontWeight: "800",
  color: colors.textPrimary,
  marginBottom: 16,
}
});