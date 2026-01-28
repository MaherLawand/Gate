import AppButton from "@/src/components/AppButton";
import ClientHeader from "@/src/components/ClientHeader";
import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import Screen from "../../src/components/Screen";
import { colors } from "../../src/theme/colors";

export default function ProfileScreen() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("johndoe@email.com");
  const [bio, setBio] = useState("I love working out!");
  // TODO: Add profile picture upload later

  return (
    <Screen>
      <ClientHeader />

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <AppButton title="Save Profile" onPress={() => alert("Profile saved!")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.white,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.white,
    padding: 12,
    borderRadius: 8,
  },
});
