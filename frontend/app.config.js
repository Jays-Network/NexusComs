import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "Nexus Coms",
  slug: "nexuscoms",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/nexus-coms-logo.jpg",
  scheme: "nexuscoms",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.worldrisk.app",
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription: "Nexus Coms needs access to your location to share it with your group members.",
      NSLocationWhenInUseUsageDescription: "Nexus Coms needs access to your location to share it with your group members.",
      NSCameraUsageDescription: "Nexus Coms needs access to your camera to share photos and videos.",
      NSPhotoLibraryUsageDescription: "Nexus Coms needs access to your photo library to share photos and videos.",
      NSMicrophoneUsageDescription: "Nexus Coms needs access to your microphone for voice and video calls."
    }
  },
  android: {
    package: "com.worldrisk.app",
    adaptiveIcon: {
      backgroundColor: "#000000",
      foregroundImage: "./assets/images/nexus-coms-logo.jpg"
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.RECORD_AUDIO",
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_CONNECT",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.WAKE_LOCK"
    ]
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24
        },
        ios: {
          deploymentTarget: "15.1"
        }
      }
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/nexus-coms-logo.jpg",
        imageWidth: 300,
        resizeMode: "contain",
        backgroundColor: "#000000",
        dark: {
          backgroundColor: "#000000"
        }
      }
    ],
    "expo-web-browser",
    [
      "expo-notifications",
      {
        icon: "./assets/images/nexus-coms-logo.jpg",
        color: "#FFFFFF",
        sounds: [
          "./assets/sounds/emergency.wav"
        ]
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Nexus Coms needs access to your location to share it with your group members.",
        locationWhenInUsePermission: "Nexus Coms needs access to your location to share it with your group members."
      }
    ],
    "expo-asset",
    "expo-audio",
    "expo-secure-store",
    "expo-video"
  ],
  experiments: {
    reactCompiler: true
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://NexusComs.replit.app",
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "46607011-72f5-4fd2-9b2a-e673cf3d7380",
    }
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  updates: {
    url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || "46607011-72f5-4fd2-9b2a-e673cf3d7380"}`
  }
});
