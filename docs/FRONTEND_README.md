# World Risk - Frontend Mobile App

Production-ready mobile chat application built with Expo React Native and Stream.io for real-time messaging, emergency alerts, and group communication.

## Features

- **Hierarchical Group Messaging**: Organized group chat with Stream channels
- **Real-time Chat**: Instant messaging with Stream Chat SDK
- **Emergency Alert System**: Audio alerts, haptic feedback, and visual warnings
- **File Sharing**: Document and image sharing via expo-document-picker
- **Location Tracking**: React-native-maps integration (requires EAS build)
- **Video Calling**: Stream Video SDK support (disabled in Expo Go, requires EAS build)
- **Push Notifications**: Expo notifications configured

## Tech Stack

- **Framework**: Expo SDK 54
- **UI**: React Native with custom StyleSheet components
- **Styling**: NativeWind/Tailwind CSS (installed, currently unused)
- **Navigation**: React Navigation 7+
- **Chat**: Stream Chat React Native SDK
- **State**: React hooks and context
- **Storage**: AsyncStorage
- **Design**: iOS 26 Liquid Glass interface

> **Note**: While NativeWind is installed as a dependency, the current codebase uses React Native's StyleSheet API for styling. NativeWind can be utilized for future development if desired.

## Prerequisites

- Node.js 18+ 
- Expo CLI
- Expo account (for testing on physical devices)
- Backend authentication server running (see backend repository)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/world-risk.git
   cd world-risk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with:
   ```env
   EXPO_PUBLIC_STREAM_API_KEY=your_stream_api_key
   EXPO_PUBLIC_API_URL=http://localhost:3000  # Backend URL
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Running the App

### On Physical Device (Recommended)

1. Install Expo Go on your iOS/Android device
2. Start the dev server: `npm run dev`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### On Web

```bash
npm run dev
```
Then press `w` to open in browser (note: web version may differ from native)

## Environment Variables

Required environment variables:

- `EXPO_PUBLIC_STREAM_API_KEY` - Stream API key for client-side SDK
- `EXPO_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3000)
- `EXPO_PACKAGER_PROXY_URL` - Replit proxy URL (auto-configured on Replit)
- `REACT_NATIVE_PACKAGER_HOSTNAME` - Packager hostname (auto-configured on Replit)

## Important Notes

### Authentication
This app **requires** the backend authentication server to be running. The backend securely generates Stream tokens - never expose the Stream API Secret in the frontend.

### Video Features
Stream Video SDK is currently disabled in Expo Go due to WebRTC incompatibility. To enable:
1. Build with EAS: `eas build`
2. Uncomment video imports in `utils/streamClient.ts`

### Emergency Alerts
Emergency alert audio file (`emergency.wav`) should be placed in `assets/sounds/` directory.

## Project Structure

```
├── App.tsx                 # Root component
├── app.json               # Expo configuration
├── screens/               # Screen components
├── components/            # Reusable components
├── navigation/            # Navigation configuration
├── utils/                 # Utilities and helpers
│   ├── streamClient.ts   # Stream SDK initialization
│   ├── streamAuth.tsx    # Auth context provider
│   └── streamApi.ts      # Backend API client
├── constants/             # Theme and constants
├── assets/               # Images, sounds, fonts
└── design_guidelines.md  # UI/UX design system
```

## Key Files

- `utils/streamClient.ts` - Stream Chat and Video client setup
- `utils/streamAuth.tsx` - Authentication context and token management
- `utils/streamApi.ts` - Backend API integration
- `screens/ChatRoomScreen.tsx` - Main chat interface
- `components/EmergencyModal.tsx` - Emergency alert component

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## Deployment

See Expo's publishing documentation:
```bash
eas update
```

## Known Limitations

1. Video calling requires EAS build (not available in Expo Go)
2. react-native-maps has limited Expo Go support
3. expo-av is deprecated - migration to expo-audio recommended

## Troubleshooting

### Authentication Fails
- Ensure backend server is running
- Check `EXPO_PUBLIC_API_URL` points to correct backend
- Verify Stream API credentials

### App Crashes
- Check ErrorBoundary logs
- Ensure all required packages are installed
- Restart Metro bundler: `npm run dev`

### Stream Connection Issues
- Verify backend generates valid tokens
- Check network connectivity
- Ensure Stream API key is correct

## Support

For issues related to:
- Stream SDK: https://getstream.io/chat/docs/
- Expo: https://docs.expo.dev/
- React Navigation: https://reactnavigation.org/

## License

Proprietary - World Risk Application
