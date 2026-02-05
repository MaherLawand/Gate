export type UserRole = "client" | "trainer";
import { FieldValue, Timestamp } from "firebase/firestore";

export interface UserDoc {
  role: "trainer";
  isAdmin: boolean;
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

// 🔧 ONLY used while editing in TextInput
export type DraftExerciseSet = {
  reps: string;       // "" | "12"
  weightKg: string;  // "" | "40"
};

export type DraftSessionExercise = {
  exerciseId: string;
  name: string;
  sets: DraftExerciseSet[];
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
  attendance: string;
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

export type BugDoc = {
  description: string;
  screenshotUrl?: string;

  reporterId: string; // client doc ID
  authUid: string; // Firebase Auth UID

  app: {
    platform: "android" | "ios";
    appVersion: string;
  };

  context: {
    screen: string;
    route?: string;
  };

  status: "open";

  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
};
