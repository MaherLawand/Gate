import AppButton from "@/src/components/AppButton";
import { compressImage } from "@/src/services/compressImage";
import { uploadProfilePicture } from "@/src/services/uploadProfilePicture";
import { colors } from "@/src/theme/colors";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ProfileData = {
  role: "trainer" | "client";
  firstName?: string;
  lastName?: string;
  phone: string;
  bio?: string;
  profilePicture?: string;
  trainerName?: string;
  createdAt?: any;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const uid = auth().currentUser?.uid;
  useEffect(() => {
    console.log("Profile data:", profile);
  }, [profile]);
  useEffect(() => {
    if (!uid) return;

    const loadProfile = async () => {
      try {
        // 1️⃣ Check trainer
        const trainerSnap = await firestore()
          .collection("users")
          .doc(uid)
          .get();

        if (trainerSnap.exists()) {
          const data = trainerSnap.data()!;
          setProfile({
            role: "trainer",
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            bio: data.bio ?? "",
            profilePicture: data.profilePicture ?? undefined,
            createdAt: data.createdAt,
          });
          setFirstName(data.firstName ?? "");
          setLastName(data.lastName ?? "");
          setBio(data.bio ?? "");
          setLoading(false);
          return;
        }

        // 2️⃣ Otherwise client
        const clientSnap = await firestore()
          .collection("clients")
          .where("authUid", "==", uid)
          .limit(1)
          .get();

        if (!clientSnap.empty) {
          const doc = clientSnap.docs[0];
          const data = doc.data();

          setProfile({
            role: "client",
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            bio: data.bio ?? "",
            trainerName: data.trainerName,
            profilePicture: data.profilePicture ?? undefined,
            createdAt: data.createdAt,
          });

          setFirstName(data.firstName ?? "");
          setLastName(data.lastName ?? "");
          setBio(data.bio ?? "");
          setNotificationsEnabled(data.notificationsEnabled ?? true);
        }
      } catch (e: any) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [uid]);

  const handleSave = async () => {
    try {
      if (!profile) return;

      if (profile.role === "trainer") {
        await firestore().collection("users").doc(uid).update({
          firstName,
          lastName,
          bio,
          notificationsEnabled,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const snap = await firestore()
          .collection("clients")
          .where("authUid", "==", uid)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            firstName,
            lastName,
            bio,
            notificationsEnabled,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleChangePhoto = async () => {
    if (!uid || !profile) return;
    console.log("TYTYHT");
    console.log("AUTH UID:", auth().currentUser?.uid);
    console.log("AUTH TOKEN:", await auth().currentUser?.getIdToken());

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploading(true);

      const imageUri = result.assets[0].uri;
      const compressedUri = await compressImage(imageUri);
      // ✅ CORRECT call (ONE argument)
      const downloadURL = await uploadProfilePicture(compressedUri);

      // 🔥 Save URL in Firestore
      if (profile.role === "trainer") {
        await firestore().collection("users").doc(uid).update({
          profilePicture: downloadURL,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const snap = await firestore()
          .collection("clients")
          .where("authUid", "==", uid)
          .limit(1)
          .get();

        if (!snap.empty) {
          await snap.docs[0].ref.update({
            profilePicture: downloadURL,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // ✅ Update UI instantly
      setProfile((prev) =>
        prev ? { ...prev, profilePicture: downloadURL } : prev
      );
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Information</Text>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handleChangePhoto} disabled={uploading}>
          <View style={styles.avatarWrapper}>
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}

            <Image
              source={
                profile.profilePicture
                  ? { uri: profile.profilePicture }
                  : require("../assets/images/avatar-placeholder.png")
              }
              style={styles.avatar}
            />
          </View>

          <Text style={styles.changePhoto}>
            {uploading ? "Uploading..." : "Change photo"}
          </Text>
        </TouchableOpacity>
      </View>
      {/* NAME */}
      <>
        <Text style={styles.label}>First name</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
        />
      </>

      {/* BIO */}
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        value={bio}
        onChangeText={setBio}
      />

      <Text style={styles.label}>Preferences</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          thumbColor={colors.primary}
        />
      </View>

      {/* PHONE */}
      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={profile.phone} editable={false} />

      {/* TRAINER NAME (CLIENT ONLY) */}
      {profile.role === "client" && (
        <>
          <Text style={styles.label}>Client</Text>
          <Text style={styles.readonly}>{profile.trainerName}</Text>
        </>
      )}

      {/* ROLE (TRAINER ONLY) */}
      {profile.role === "trainer" && (
        <>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.readonly}>Trainer</Text>
        </>
      )}

      <AppButton title="Save changes" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.textPrimary,
    padding: 14,
    borderRadius: 8,
  },
  readonly: {
    color: colors.textPrimary,
    paddingVertical: 8,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
  },
  changePhoto: {
    color: colors.primary,
    marginTop: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  avatarWrapper: {
    position: "relative",
  },

  avatarOverlay: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
