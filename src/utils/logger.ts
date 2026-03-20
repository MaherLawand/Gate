import Constants from "expo-constants";
import crashlytics from "@react-native-firebase/crashlytics";

const ENV =
  Constants.expoConfig?.extra?.variant ?? "prod";

const isDev = ENV === "dev";

/* ================= DEBUG LOGS (DEV ONLY) ================= */

export const log = (...args: any[]) => {
    console.log(...args);
};

export const info = (...args: any[]) => {
  if (isDev) {
    console.info(...args);
  }
};

/* ================= WARNINGS (DEV + PROD) ================= */

export const warn = (...args: any[]) => {
  console.warn(...args);

  // Send warning to Crashlytics as non-fatal
  crashlytics().log(`[WARN] ${args.join(" ")}`);
};

/* ================= ERRORS (DEV + PROD) ================= */

export const error = (...args: any[]) => {
  console.error(...args);

  // Send as non-fatal error
  const message = args.map(String).join(" ");
  crashlytics().recordError(new Error(message));
};