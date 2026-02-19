import 'dotenv/config';

const variant = process.env.APP_VARIANT ?? "prod";
console.log("CONFIG VARIANT:", variant);
const isDev = variant === "dev";

export default {
  expo: {
    slug: "Gate",
    name: isDev ? "Gate (Dev)" : "Gate",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/gate-logo.png",
    scheme: "gate",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    notification: {
      iosDisplayInForeground: true
    },
    platforms: ["ios", "android"],

    ios: {
      icon: "./assets/images/gate-logo.png",
      supportsTablet: true,
      bundleIdentifier: isDev
        ? "com.maherlawand.GatePrivateGym.dev"
        : "com.maherlawand.GatePrivateGym",
      googleServicesFile: isDev
        ? "./GoogleService-Info.dev.plist"
        : "./GoogleService-Info.plist",
      infoPlist: {
  CFBundleURLTypes: [
    {
      CFBundleURLSchemes: [
        isDev
          ? "app-1-93366333711-ios-1561398c4b38e599d84e7a"
          : "app-1-334248254952-ios-6fa6073f596bf9dfbb585d"
      ]
    }
  ],
        UIBackgroundModes: ["remote-notification"],
        NSPhotoLibraryUsageDescription:
          "We need access to your photos to upload profile pictures and bug screenshots.",
        ITSAppUsesNonExemptEncryption: false
      }
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/gate-logo.png",
        backgroundColor: "#E6F4FE"
      },
      notification: {
        color: "#ffffff",
        icon: "./assets/images/gate-logo.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: isDev
        ? "com.maherlawand.GatePrivateGym.dev"
        : "com.maherlawand.GatePrivateGym",
      googleServicesFile: isDev
        ? "./google-services.dev.json"
        : "./google-services.json"
    },

    web: {
      output: "static"
    },

    plugins: [
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            buildReactNativeFromSource: true,
            extraPods:[
              {
              name:"RecaptchaEnterprise"
              }
            ]
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/gate-logo.png",
          color: "#E6F4Fe"
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-secure-store",
      "expo-font"
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },

    extra: {
      variant,
      router: {},
      eas: {
        projectId: "5bc10cd6-e679-4eb4-a6d5-3bb4abc257d7"
      }
    },

    owner: "maherlawand"
  }
};