// src/services/firestoreHelpers.ts

import firestore from "@react-native-firebase/firestore";
import { root } from "./db";
import {log,warn,error,info} from "../utils/logger"

/* ---------------- DOC ---------------- */

export const doc = (...path: string[]) => {
  info("[FirestoreHelper:doc]", { path });

  let ref: any = root(); // ✅ start from environments/{ENV}

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

/* ---------------- COLLECTION ---------------- */

export const collection = (...path: string[]) => {
  info("[FirestoreHelper:collection]", { path });

  let ref: any = root(); // ✅ start from environments/{ENV}

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

/* ---------------- BASIC OPS ---------------- */

export const getDoc = (ref: any) => {
  info("[FirestoreHelper:getDoc]");
  return ref.get();
};

export const addDoc = (colRef: any, data: any) => {
  info("[FirestoreHelper:addDoc]");
  return colRef.add(data);
};

export const deleteDoc = (ref: any) => {
  info("[FirestoreHelper:deleteDoc]");
  return ref.delete();
};

export const setDoc = (ref: any, data: any, options?: any) => {
  info("[FirestoreHelper:setDoc]", {
    merge: options?.merge ?? false,
  });
  return ref.set(data, options);
};

export const serverTimestamp = () => {
  info("[FirestoreHelper:serverTimestamp]");
  return firestore.FieldValue.serverTimestamp();
};