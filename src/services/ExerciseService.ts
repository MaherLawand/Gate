import firestore from "@react-native-firebase/firestore";
import { Exercise } from "../types/models";
import { root } from "./db";
import {log,warn,error,info} from "../utils/logger"

export async function getExercises(): Promise<Exercise[]> {
  info("[Exercise:getExercises] start");

  const snap = await root()
    .collection("Exercises")
    .orderBy("name")
    .get();

  info("[Exercise:getExercises] fetched", {
    count: snap.docs.length,
  });

  const exercises = snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    category: d.data().category,
  }));

  info("[Exercise:getExercises] success");

  return exercises;
}