// src/services/firebase.ts

import firebase, { getApp } from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";
import {log,warn,error,info} from "../utils/logger"

const app = getApp();

log("🔥 Firebase Project ID:", app.options.projectId);
log("🔥 Firebase App Name:", app.name);
log("🔥 Firebase API Key:", app.options.apiKey);
log("🔥 iOS Firebase apps:", firebase.apps.length);
export { auth, firestore, functions };
