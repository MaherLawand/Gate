import AppButton from "@/src/components/AppButton";
import { createAnnouncement } from "@/src/services/announcementService";
import { compressImage } from "@/src/services/compressImage";
import { uploadImage } from "@/src/services/uploadImage";
import { colors } from "@/src/theme/colors";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ActionSheet, {
  ActionSheetRef,
  ScrollView as SheetScrollView,
} from "react-native-actions-sheet";

type TrainerProfile = {
  firstName: string;
  lastName: string;
  bio?: string;
  profilePicture?: string;
  coverImage?: string;
  isAdmin?: boolean;
};

export default function TrainerDashboard() {
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
  const [announcementTitle,setAnnouncementTitle] = useState("");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementImage, setAnnouncementImage] = useState<string | null>(
    null
  );
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    try {
      setUploading(true);
      const compressed = await compressImage(result.assets[0].uri);
      const url = await uploadImage(compressed);

      await firestore().collection("users").doc(uid).update({
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
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });

    if (result.canceled) return;

    try {
      setUploading(true);
      const compressed = await compressImage(result.assets[0].uri);
      const url = await uploadImage(compressed);

      await firestore().collection("users").doc(uid).update({
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

    await firestore().collection("users").doc(uid).update({
      bio: bioDraft.trim(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    setProfile((p) => p && { ...p, bio: bioDraft.trim() });
    setEditingBio(false);
  };

  useEffect(() => {
    if (!uid) return;

    const loadTrainer = async () => {
      try {
        const snap = await firestore().collection("users").doc(uid).get();

        if (!snap.exists) return;

        const data = snap.data()!;
        setProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio,
          profilePicture: data.profilePicture,
          coverImage: data.coverImage,
          isAdmin: data.isAdmin === true,
        });
      } catch (e) {
        console.error("Failed to load trainer profile", e);
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
      allowsEditing: true,
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
        imageUrl = await uploadImage(compressed);
      }

      await createAnnouncement({
        title:announcementTitle,
        authorId: uid,
        text: announcementText,
        imageUrl,
      });

      setAnnouncementText("");
      setAnnouncementImage(null);
      adminSheetRef.current?.hide();

      Alert.alert("Posted", "Announcement published successfully");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* COVER */}
      <TouchableOpacity activeOpacity={0.9} onPress={pickCover}>
        <Image
          source={
            profile.coverImage
              ? { uri: profile.coverImage }
              : require("../../assets/images/avatar-placeholder.png")
          }
          style={styles.cover}
        />
      </TouchableOpacity>

      {/* AVATAR */}
      <View style={styles.avatarWrap}>
        <TouchableOpacity onPress={pickAvatar}>
          <Image
            source={
              profile.profilePicture
                ? { uri: profile.profilePicture }
                : require("../../assets/images/avatar-placeholder.png")
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.name}>
          {profile.firstName} {profile.lastName}
        </Text>

        <Text style={styles.handle}>Trainer</Text>

        <View style={{ marginTop: 12 }}>
          {!editingBio ? (
            profile.bio ? (
              <View style={styles.bioRow}>
                <Text style={styles.bio}>{profile.bio}</Text>

                <TouchableOpacity
                  onPress={() => {
                    setBioDraft(profile.bio ?? "");
                    setEditingBio(true);
                  }}
                >
                  <Text style={styles.editIcon}>✎</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingBio(true)}>
                <Text style={styles.addBio}>+ Add a bio</Text>
              </TouchableOpacity>
            )
          ) : (
            <>
              <TextInput
                style={styles.bioInput}
                multiline
                placeholder="Write something about yourself…"
                value={bioDraft}
                onChangeText={setBioDraft}
              />

              <AppButton title="Save bio" onPress={saveBio} />
            </>
          )}
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => adminSheetRef.current?.show()}
          >
            <Text style={styles.adminButtonText}>📢 New Announcement</Text>
          </TouchableOpacity>
        )}
      </View>
      <ActionSheet
        ref={adminSheetRef}
        gestureEnabled
        closeOnTouchBackdrop
        indicatorStyle={{ backgroundColor: colors.primary }}
        containerStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 10,
        }}
      >
        <SheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={styles.sheetTitle}>New Announcement</Text>

          <TextInput
            style={styles.announcementInput}
            placeholder="Write a Title"
            placeholderTextColor={colors.textSecondary}
            multiline
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
              <Text style={styles.imagePlaceholder}>
                + Add image (optional)
              </Text>
            )}
          </TouchableOpacity>

          {/* TEXT */}
          <TextInput
            style={styles.announcementInput}
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
      </ActionSheet>
    </View>
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
    fontSize: 22,
    fontWeight: "800",
  },

  handle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },

  bio: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
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
    fontSize: 14,
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
});
