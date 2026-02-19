import firestore from "@react-native-firebase/firestore";

export const db = firestore();

export function root() {
  return db; // no environments wrapper anymore
}

export const doc = (...path: string[]) => {
  console.info("[FirestoreHelper:doc]", { path });

  let ref: any = root();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const collection = (...path: string[]) => {
  console.info("[FirestoreHelper:collection]", { path });

  let ref: any = root();

  path.forEach((segment, i) => {
    ref = i % 2 === 0 ? ref.collection(segment) : ref.doc(segment);
  });

  return ref;
};

export const serverTimestamp =
  firestore.FieldValue.serverTimestamp;