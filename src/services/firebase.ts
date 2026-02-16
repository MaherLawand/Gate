// src/services/firebase.ts

import firebase, { getApps } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";

console.log("🔥 iOS Firebase apps:", firebase.apps.length);
export { auth, firestore, functions };
