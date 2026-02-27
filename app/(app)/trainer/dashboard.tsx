import auth from "@react-native-firebase/auth";
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { doc, collection } from "@/src/services/db";
import AnimatedAppear from "@/src/components/AnimatedAppear";
import AppButton from "@/src/components/AppButton";
import { setupNotifications } from "@/src/notifications/setupNotifications";
import { createAnnouncement } from "@/src/services/announcementService";
import { compressImage } from "@/src/services/compressImage";
import { uploadImage } from "@/src/services/uploadImage";
import { colors } from "@/src/theme/colors";
import { typography } from "@/src/theme/typography";
import { log, error } from "@/src/utils/logger";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
    TouchableWithoutFeedback,
    Keyboard,

} from "react-native";
import ActionSheet, {
  ActionSheetRef,
  ScrollView as SheetScrollView,
} from "react-native-actions-sheet";
import { Easing } from "react-native-reanimated";

type TrainerProfile = {
  firstName: string;
  lastName: string;
  bio?: string;
  profilePicture?: string;
  coverImage?: string;
  isAdmin?: boolean;
};

export default function TrainerDashboard() {
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

  const uid = auth().currentUser?.uid;

  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = profile?.isAdmin === true;

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const adminSheetRef = useRef<ActionSheetRef>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementImage, setAnnouncementImage] = useState<string | null>(
    null
  );
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
const [announcementDuration, setAnnouncementDuration] = useState<
  "3d" | "7d" | "30d" | "forever"
>("7d");
  // Cover image loading
  const coverOpacity = useRef(new Animated.Value(0)).current;
  const [coverLoading, setCoverLoading] = useState(true);

  // Avatar image loading
  const avatarOpacity = useRef(new Animated.Value(0)).current;
  const [avatarLoading, setAvatarLoading] = useState(true);

  const fadeIn = (opacity: Animated.Value) => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === "ios" ? false : true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    try {
      if(!uid ) {return;}
      setUploading(true);
      const compressed = await compressImage(result.assets[0].uri);
      const url = await uploadImage(compressed, "avatar");

      await doc("users", uid).update({
  profilePicture: url,
  updatedAt: firestore.FieldValue.serverTimestamp(),
});

      setProfile((p) => p && { ...p, profilePicture: url });
    } finally {
      setUploading(false);
    }
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === "ios" ? false : true,
      aspect: [16, 9],
      quality: 0.9,
    });

    if (result.canceled) return;

    try {
      if(!uid) { return; }
      setUploading(true);
      const compressed = await compressImage(result.assets[0].uri);
      const url = await uploadImage(compressed, "cover");

      await doc("users", uid).update({
  coverImage: url,
  updatedAt: firestore.FieldValue.serverTimestamp(),
});

      setProfile((p) => p && { ...p, coverImage: url });
    } finally {
      setUploading(false);
    }
  };

  const saveBio = async () => {
    if (!uid) return;

    await doc("users", uid).update({
  bio: bioDraft.trim(),
  updatedAt: firestore.FieldValue.serverTimestamp(),
});

    setProfile((p) => p && { ...p, bio: bioDraft.trim() });
    setEditingBio(false);
  };

  useEffect(() => {
    if (!uid) return;
    setupNotifications();
    const loadTrainer = async () => {
      try {
        const snap = await doc("users", uid).get();

        if (!snap.exists()) return;

        const data = snap.data()!;
       log("data: " , data)
        setProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          profilePicture: data.profilePicture,
          coverImage: data.coverImage,
          isAdmin: data.isAdmin === true,
        });
       log("PROFILE PIC URL:", data.profilePicture);
       log("COVER URL:", data.coverImage);
      } catch (e) {
       error("Failed to load trainer profile", e);
      } finally {
        setLoading(false);
      }
    };

    loadTrainer();
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) return null;

  const pickAnnouncementImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS === "ios" ? false : true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (result.canceled) return;

    setAnnouncementImage(result.assets[0].uri);
  };

const handlePostAnnouncement = async () => {
  if (!uid) return;

  try {
    setPostingAnnouncement(true);

    let imageUrl: string | null = null;

    if (announcementImage) {
      const compressed = await compressImage(announcementImage);
      imageUrl = await uploadImage(compressed, "announcement");
    }

    // 🔥 Calculate expiration
    let expiresAt: FirebaseFirestoreTypes.Timestamp | null = null;

    if (announcementDuration !== "forever") {
      const daysMap = {
        "3d": 3,
        "7d": 7,
        "30d": 30,
      };

      const days = daysMap[announcementDuration];
      const future = new Date();
      future.setDate(future.getDate() + days);

      expiresAt = firestore.Timestamp.fromDate(future);
    }

    await createAnnouncement({
      title: announcementTitle,
      authorId: uid,
      text: announcementText,
      imageUrl,
      expiresAt,
    });

    setAnnouncementText("");
    setAnnouncementImage(null);
    adminSheetRef.current?.hide();

    Alert.alert("Posted", "Announcement published successfully");
  } finally {
    setPostingAnnouncement(false);
  }
};

  return (
    <TouchableWithoutFeedback
    onPress={() => {
      if (Platform.OS === "ios") {
        Keyboard.dismiss();
      }
    }}
    accessible={false}
  >
    <View style={styles.container}>
      {/* COVER */}
      {/* COVER */}
      {/* COVER */}
      <TouchableOpacity activeOpacity={0.9} onPress={pickCover}>
        <View style={styles.coverWrap}>
          {coverLoading && (
            <View style={styles.imageLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          <Animated.Image
            source={
              profile.coverImage
                ? { uri: profile.coverImage }
                : require("../../../assets/images/gate-logo2.png")
            }
            style={[styles.cover, { opacity: coverOpacity }]}
            resizeMode="cover"
            onLoadStart={() => {
              setCoverLoading(true);
              coverOpacity.setValue(0);
            }}
            // onLoadEnd={() => {
            //   setCoverLoading(false);
            //   fadeIn(coverOpacity);
            // }}
            onLoadEnd={() => {
              requestAnimationFrame(() => {
                setCoverLoading(false);
                fadeIn(coverOpacity);
              });
            }}
          />
        </View>
      </TouchableOpacity>

      {/* AVATAR */}
      {/* AVATAR */}
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={pickAvatar}>
          <View style={styles.avatarInner}>
            {avatarLoading && (
              <View style={styles.avatarLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            <Animated.Image
              source={
                profile.profilePicture
                  ? { uri: profile.profilePicture }
                  : require("../../../assets/images/icons8-profile-96.png")
              }
              style={[styles.avatar, { opacity: avatarOpacity }]}
              resizeMode="cover"
              onLoadStart={() => {
                setAvatarLoading(true);
                avatarOpacity.setValue(0);
              }}
              // onLoadEnd={() => {
              //   setAvatarLoading(false);
              //   fadeIn(avatarOpacity);
              // }}
              onLoadEnd={() => {
                requestAnimationFrame(() => {
                  setAvatarLoading(false);
                  fadeIn(avatarOpacity);
                });
              }}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <AnimatedAppear delay={0}>
          <Text style={[typography.heading, styles.name]}>
            {profile.firstName} {profile.lastName}
          </Text>
        </AnimatedAppear>

        <AnimatedAppear delay={60}>
          <Text style={[typography.small, styles.handle]}>Trainer</Text>
        </AnimatedAppear>
        <AnimatedAppear delay={120}>
          <View style={{ marginTop: 12 }}>
            {!editingBio ? (
              profile.bio ? (
                <View style={styles.bioRow}>
                  <Text style={[typography.body, styles.bio]}>
                    {profile.bio}
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setBioDraft(profile.bio ?? "");
                      setEditingBio(true);
                    }}
                  >
                    <Text style={[typography.small, styles.editIcon]}>✎</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingBio(true)}>
                  <Text style={[typography.bodyMedium, styles.addBio]}>
                    + Add a bio
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <>
                <TextInput
                  style={[typography.body, styles.bioInput]}
                  multiline
                  placeholder="Write something about yourself…"
                  placeholderTextColor={colors.textSecondary}
                  value={bioDraft}
                  onChangeText={setBioDraft}
                />

                <AppButton title="Save bio" onPress={saveBio} />
              </>
            )}
          </View>
        </AnimatedAppear>

        {isAdmin && (
          <AnimatedAppear delay={200}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => adminSheetRef.current?.show()}
            >
              <Text style={[typography.button, styles.adminButtonText]}>
                📢 New Announcement
              </Text>
            </TouchableOpacity>
          </AnimatedAppear>
        )}
      </View>
      <ActionSheet
        ref={adminSheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        indicatorStyle={{ backgroundColor: colors.primary }}
        containerStyle={{
          backgroundColor: "transparent",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 10,
        }}
      >
        <BlurView
  intensity={50}
  tint="dark"
  style={{
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(18,18,22,0.65)", // glass overlay
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  }}
>
        <SheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={[typography.title, styles.sheetTitle]}>
            New Announcement
          </Text>
  <View style={{ marginBottom: 16 }}>
  <Text style={[typography.small, { color: colors.textSecondary }]}>
    Duration
  </Text>

  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
    {[
      { label: "3 Days", value: "3d" },
      { label: "7 Days", value: "7d" },
      { label: "30 Days", value: "30d" },
      { label: "Forever", value: "forever" },
    ].map((item) => (
      <TouchableOpacity
        key={item.value}
        onPress={() => setAnnouncementDuration(item.value as any)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 14,
          backgroundColor:
            announcementDuration === item.value
              ? colors.primary
              : colors.card,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 12 }}>
          {item.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
          <TextInput
            style={[typography.body, styles.announcementInput]}
            placeholder="Write a Title"
            placeholderTextColor={colors.textSecondary}
            value={announcementTitle}
            onChangeText={setAnnouncementTitle}
          />

          {/* IMAGE */}
          <TouchableOpacity
            style={styles.announcementImagePicker}
            onPress={pickAnnouncementImage}
          >
            {announcementImage ? (
              <Image
                source={{ uri: announcementImage }}
                style={styles.announcementImage}
              />
            ) : (
              <Text style={[typography.small, styles.imagePlaceholder]}>
                + Add image (optional)
              </Text>
            )}
          </TouchableOpacity>

          {/* TEXT */}
          <TextInput
            style={[typography.body, styles.announcementInput]}
            placeholder="Write an announcement…"
            placeholderTextColor={colors.textSecondary}
            multiline
            value={announcementText}
            onChangeText={setAnnouncementText}
          />

          <AppButton
            title={postingAnnouncement ? "Posting…" : "Post announcement"}
            onPress={handlePostAnnouncement}
            disabled={postingAnnouncement}
          />
        </SheetScrollView>
        </BlurView>
      </ActionSheet>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  cover: {
    width: "100%",
    height: 160,
  },

  avatarWrap: {
    position: "absolute",
    top: 110,
    left: 20,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.background,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
  },

  content: {
    marginTop: 64,
    paddingHorizontal: 20,
  },

  name: {
    color: colors.textPrimary,
  },

  handle: {
    color: colors.textSecondary,
    marginBottom: 12,
  },

  bio: {
    color: colors.textPrimary,
    marginBottom: 20,
  },
  bioRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  editIcon: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },

  addBio: {
    color: colors.primary,
  },

  bioInput: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
  },
  adminButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999, // pill style
    alignSelf: "flex-start",
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  adminButtonText: {
    color: "#fff",
  },
  sheetTitle: {
    color: colors.textPrimary,
    marginBottom: 12,
  },

  announcementImagePicker: {
    backgroundColor: colors.card,
    borderRadius: 12,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },

  announcementImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    color: colors.textSecondary,
  },

  announcementInput: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  coverWrap: {
    width: "100%",
    height: 160,
    backgroundColor: colors.card,
  },

  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },

  avatarInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarLoader: {
    position: "absolute",
    zIndex: 2,
  },
});
