export type UserRole = "client" | "trainer";
import { FieldValue, Timestamp } from "firebase/firestore";

export interface UserDoc {
  role: "trainer";

  // Identity
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture?: string;
  bio?: string;

  // Account settings
  notificationsEnabled?: boolean;

  // System
  authUid?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface ClientProfile {
  id?: string;

  // Identity
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture?: string;
  bio?: string;
  gender: "male" | "female";
  isHijabi?: boolean; // only relevant if female
  // Trainer relationship
  trainerId: string;
  trainerName: string;

  // Account settings
  notificationsEnabled?: boolean;

  // Status
  isActive: boolean;

  // Auth state
  authUid?: string | null;
  phoneVerified?: boolean;

  // System
  createdAt: Timestamp | FieldValue;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
}
export type Exercise = {
  id: string; // 🔥 Firestore doc ID
  name: string;
  category: "Push" | "Pull" | "Legs";
};

export type ExerciseSet = {
  reps: number;
  weightKg: number;
};

export type SessionExercise = {
  exerciseId: string;
  name: string;
  sets: ExerciseSet[];
};

export type SessionData = {
  date: string; // YYYY-MM-DD
  exercises: SessionExercise[];
  packageId: string;
};

export type SessionWithId = SessionData & {
  id: string;
};

export type ClientPackage = {
  id?: string;

  price: number; // 240

  totalSessions: number; // 16 (derived but stored)
  sessionsRemaining: number;
  isPaid: boolean;
  paidAt?: any | null;
  status: "active" | "completed" | "expired" | "cancelled";

  cancelledAt?: any;
  reactivatedAt?: any;
  createdAt: any; // serverTimestamp
  completedAt?: any;
};

export type ClientAuthResult = {
  id: string;
  phoneVerified?: boolean;
  authUid?: string;
};

export type AttendanceStatus =
  | "pending"
  | "confirmed"
  | "no_show"
  | "charged-no-show";

export type ScheduledSession = {
  id: string; // scheduleSessionId

  clientId: string;
  clientName: string;
  clientPackageId: string;
  clientGender: string;
  clientIsHijabi: boolean;

  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  // UI-derived (NOT stored in Firestore)
  startMinutes?: number;
  endMinutes?: number;
  attendance: AttendanceStatus;

  createdAt: Timestamp;
};
