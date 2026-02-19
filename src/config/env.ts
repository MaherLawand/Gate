import { Platform } from "react-native";
import Constants from "expo-constants";

const bundleId =
  Platform.OS === "ios"
    ? Constants.expoConfig?.ios?.bundleIdentifier
    : Constants.expoConfig?.android?.package;

export const ENV =
  bundleId?.includes(".dev") ? "dev" : "prod";