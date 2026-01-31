// src/services/firebase.ts
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";

if (__DEV__) {
  functions().useEmulator("localhost", 5001);
}

export { auth, firestore, functions };