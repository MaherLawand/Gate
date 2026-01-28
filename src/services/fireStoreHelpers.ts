// src/services/firestoreHelpers.ts
import firestore from "@react-native-firebase/firestore";

export const doc = (...path: string[]) => {
  let ref: any = firestore();
  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });
  return ref;
};

export const collection = (...path: string[]) => {
  let ref: any = firestore();
  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });
  return ref;
};

export const getDoc = (ref: any) => ref.get();
export const addDoc = (colRef: any, data: any) => colRef.add(data);
export const deleteDoc = (ref: any) => ref.delete();
export const setDoc = (ref: any, data: any, options?: any) =>
  ref.set(data, options);
export const serverTimestamp = () =>
  firestore.FieldValue.serverTimestamp();
