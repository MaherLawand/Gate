import { colors } from "@/src/theme/colors";
import { Alert, Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { BackHandler } from "react-native";
import { router, useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect } from "react";

const IMAGE_HEIGHT = 280;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function TrainerHome() {

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace("/trainer/dashboard");
        return true; // ⛔ block default back
      };

      // Android hardware back
      const sub =
        Platform.OS === "android"
          ? BackHandler.addEventListener("hardwareBackPress", onBack)
          : null;

      return () => {
        sub?.remove();
      };
    }, [])
  );


  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const createParallaxStyle = (offset: number) =>
    useAnimatedStyle(() => {
      const relativeY = scrollY.value - offset;

      const translateY = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [-80, 0, 80], // 🔥 much smaller movement
        Extrapolation.CLAMP
      );

      const scale = interpolate(
        relativeY,
        [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT],
        [1.08, 1, 1.3], // 🔥 subtle zoom
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateY }, { scale }],
      };
    });

  const imageStyle1 = createParallaxStyle(0);
  const imageStyle2 = createParallaxStyle(IMAGE_HEIGHT + 240);

  return (
    <View style={styles.container}>
      {/* Sticky header */}
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
          <Text style={styles.text}>
            Duis aute irure dolor in reprehenderit in voluptate.
          </Text>
          <Text style={styles.text}>
            Duis aute irure dolor in reprehenderit in voluptate.
          </Text>
        </View>

        {/* IMAGE 2 */}
        <View style={styles.imageWrapper}>
          <Animated.Image
            source={{
              uri: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b",
            }}
            style={[styles.image, imageStyle2]}
            resizeMode="cover"
          />
        </View>

        {/* CONTENT 2 */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Coach & Progress</Text>
          <Text style={styles.text}>
            Excepteur sint occaecat cupidatat non proident.
          </Text>
          <Text style={styles.text}>Curabitur pretium tincidunt lacus.</Text>
          <Text style={styles.sectionTitle}>Coach & Progress</Text>
          <Text style={styles.text}>
            Excepteur sint occaecat cupidatat non proident.
          </Text>
          <Text style={styles.text}>Curabitur pretium tincidunt lacus.</Text>
          <Text style={styles.sectionTitle}>Coach & Progress</Text>
          <Text style={styles.text}>
            Excepteur sint occaecat cupidatat non proident.
          </Text>
          <Text style={styles.text}>Curabitur pretium tincidunt lacus.</Text>
          <Text style={styles.sectionTitle}>Coach & Progress</Text>
          <Text style={styles.text}>
            Excepteur sint occaecat cupidatat non proident.
          </Text>
          <Text style={styles.text}>Curabitur pretium tincidunt lacus.</Text>
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

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },

  imageWrapper: {
    height: IMAGE_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },

  image: {
    position: "absolute",
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    top: 0,
    left: 0,
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
    marginBottom: 14,
  },
});
