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

const exercises: Exercise[] = snap.docs.map((d) => {
  const data = d.data() as Omit<Exercise, "id">;

  return {
    id: d.id,
    ...data,
  };
});

  info("[Exercise:getExercises] success");

  return exercises;
}