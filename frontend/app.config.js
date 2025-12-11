import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "WorldRisk Nexus Coms",
  slug: "worldrisk",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/world-risk-logo.png",
  scheme: "worldrisk",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.worldrisk.app",
    infoPlist: {
      NSLocationAlwaysAndWhenInUseUsageDescription: "WorldRisk Nexus Coms needs access to your location to share it with your group members.",
      NSLocationWhenInUseUsageDescription: "WorldRisk Nexus Coms needs access to your location to share it with your group members.",
      NSCameraUsageDescription: "WorldRisk Nexus Coms needs access to your camera to share photos and videos.",
      NSPhotoLibraryUsageDescription: "WorldRisk Nexus Coms needs access to your photo library to share photos and videos.",
      NSMicrophoneUsageDescription: "WorldRisk Nexus Coms needs access to your microphone for voice and video calls."
    }
  },
  android: {
    package: "com.worldrisk.app",
    adaptiveIcon: {
      backgroundColor: "#000000",
      foregroundImage: "./assets/images/world-risk-logo.png"
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
      "android.permission.ACCESS_NETWORK_STATE"
    ]
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png"
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        image: "./assets/images/world-risk-logo.png",
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
        icon: "./assets/images/world-risk-logo.png",
        color: "#FFFFFF",
        sounds: [
          "./assets/sounds/emergency.wav"
        ]
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "WorldRisk Nexus Coms needs access to your location to share it with your group members.",
        locationWhenInUsePermission: "WorldRisk Nexus Coms needs access to your location to share it with your group members."
      }
    ]
  ],
  experiments: {
    reactCompiler: true
  },
  extra: {
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
