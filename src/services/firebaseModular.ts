// // src/services/firebaseModular.ts

// import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
// import { getApp, getApps, initializeApp } from "firebase/app";
// import { getReactNativePersistence, initializeAuth } from "firebase/auth";
// // firebaseModular.ts
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyCH1_K6V4VtHlStuVf06Ab71slATCbDJ4Q",
//   authDomain: "gate-2056a.firebaseapp.com",
//   projectId: "gate-2056a",
//   storageBucket: "gate-2056a.firebasestorage.app",
//   messagingSenderId: "334248254952",
//   appId: "1:334248254952:android:d82af71d6b519dd1bb585d",
// };

// export const app =
//   getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// /**
//  * ✅ THIS IS THE IMPORTANT PART
//  * Auth with persistence for React Native
//  */
// export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(ReactNativeAsyncStorage),
// });

// export const db = getFirestore(app);
// export const storage = getStorage(app);
