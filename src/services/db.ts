import firestore from "@react-native-firebase/firestore";
import {log,warn,error,info} from "../utils/logger"

export const db = firestore();

export function root() {
  return db; // no environments wrapper anymore
}

export const doc = (...path: string[]) => {
  info("[FirestoreHelper:doc]", { path });

  let ref: any = root();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const collection = (...path: string[]) => {
  info("[FirestoreHelper:collection]", { path });

  let ref: any = root();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const serverTimestamp =
  firestore.FieldValue.serverTimestamp;