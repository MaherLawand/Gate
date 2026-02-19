// src/services/firebase.ts

import firebase, { getApp } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";

const app = getApp();

console.log("🔥 Firebase Project ID:", app.options.projectId);
console.log("🔥 Firebase App Name:", app.name);
console.log("🔥 Firebase API Key:", app.options.apiKey);
console.log("🔥 iOS Firebase apps:", firebase.apps.length);
export { auth, firestore, functions };
