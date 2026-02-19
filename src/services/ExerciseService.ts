import firestore from "@react-native-firebase/firestore";
import { Exercise } from "../types/models";
import { root } from "./db";

export async function getExercises(): Promise<Exercise[]> {
  console.info("[Exercise:getExercises] start");

  const snap = await root()
    .collection("Exercises")
    .orderBy("name")
    .get();

  console.info("[Exercise:getExercises] fetched", {
    count: snap.docs.length,
  });

  const exercises = snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    category: d.data().category,
  }));

  console.info("[Exercise:getExercises] success");

  return exercises;
}