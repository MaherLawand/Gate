import firestore from "@react-native-firebase/firestore";
import { Exercise } from "../types/models";

export async function getExercises(): Promise<Exercise[]> {
  const snap = await firestore().collection("Exercises").orderBy("name").get();

  console.log("snmap: ", snap);

  return snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    category: d.data().category,
  }));
}
