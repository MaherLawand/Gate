// src/services/firestoreHelpers.ts

import firestore from "@react-native-firebase/firestore";

export const doc = (...path: string[]) => {
  console.info("[FirestoreHelper:doc]", { path });

  let ref: any = firestore();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const collection = (...path: string[]) => {
  console.info("[FirestoreHelper:collection]", { path });

  let ref: any = firestore();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const getDoc = (ref: any) => {
  console.info("[FirestoreHelper:getDoc]");
  return ref.get();
};

export const addDoc = (colRef: any, data: any) => {
  console.info("[FirestoreHelper:addDoc]");
  return colRef.add(data);
};

export const deleteDoc = (ref: any) => {
  console.info("[FirestoreHelper:deleteDoc]");
  return ref.delete();
};

export const setDoc = (ref: any, data: any, options?: any) => {
  console.info("[FirestoreHelper:setDoc]", { merge: options?.merge ?? false });
  return ref.set(data, options);
};

export const serverTimestamp = () => {
  console.info("[FirestoreHelper:serverTimestamp]");
  return firestore.FieldValue.serverTimestamp();
};