# Mobile Chat Application - Stream Migration

## Overview
Production-ready mobile chat application built with Expo React Native, using Stream (getstream.io) for chat, messaging, and video functionality. Successfully migrated from custom Supabase/Socket.io backend to Stream's infrastructure.

## Recent Changes (November 18, 2025)
- ✅ **Emergency Alert System**: Complete implementation with audio, haptics, and visual feedback
  - Properly handles successive alerts, even during acknowledgement fade-out
  - iOS silent mode bypass for emergency audio
  - Comprehensive resource cleanup (sound, animation, timeouts)
  - **Note**: Requires actual emergency.wav file in `assets/sounds/` directory

## Project Architecture

### Core Screens
- **LoginScreen**: User authentication using Stream dev tokens
- **GroupListScreen**: Hierarchical group messaging with channel listing
- **ChatRoomScreen**: Real-time chat with emergency alert triggering
- **EmergencyListScreen**: View emergency alert history
- **SettingsScreen**: User preferences and logout

### Key Features
1. **Hierarchical Group Messaging**: Using Stream channels
2. **Real-time Chat**: Stream SDK with message synchronization
3. **Emergency Alert System**:
   - Audio playback (emergency.wav)
   - Haptic feedback (3x heavy impact pattern)
   - Full-screen modal with pulsing animation
   - Custom message field: `emergency: true`
4. **Location Tracking**: react-native-maps (graceful fallback in Expo Go)
5. **File Sharing**: expo-document-picker integration
6. **Video Calling**: Stream Video SDK (graceful fallback in Expo Go)
7. **Push Notifications**: expo-notifications configured

### Technology Stack
- **Frontend**: Expo React Native, React Navigation 7+
- **Chat/Messaging**: Stream Chat SDK
- **Video**: Stream Video SDK
- **State Management**: React hooks, Stream context
- **Storage**: expo-secure-store for auth tokens
- **Audio**: expo-av (deprecated, migration to expo-audio pending)

## Important Files
- `utils/streamClient.ts`: Stream client initialization
- `utils/streamAuth.tsx`: Authentication context provider
- `components/EmergencyModal.tsx`: Emergency alert modal component
- `screens/ChatRoomScreen.tsx`: Main chat interface
- `App.tsx`: Root component with ErrorBoundary

## Security Notes
- **Development Mode**: Currently using client-side dev tokens
- **Production Requirements**: 
  - Implement backend server to issue JWT tokens
  - Never expose Stream API secret in client code
  - Use proper user authentication flow

## Known Limitations
1. WebRTC (video calling) doesn't work in Expo Go - graceful fallback implemented
2. react-native-maps doesn't work in Expo Go - graceful fallback implemented
3. emergency.wav audio file needs to be added to assets/sounds/ directory
4. expo-av is deprecated - migration to expo-audio recommended for SDK 54+

## Testing
- User has Expo account for physical device testing via QR code
- Web version available but may differ from iOS/Android native experience
- Recommended testing on actual iOS/Android devices through Expo Go

## User Preferences
- No specific coding style preferences documented yet
- Design follows iOS 26 Liquid Glass interface guidelines
- No emoji usage in the application

## Next Steps (Future Enhancements)
1. Add actual emergency.wav audio file
2. Implement backend server for production JWT tokens
3. Add location sharing functionality to chat
4. Complete video calling setup with Stream Video SDK
5. Migrate from expo-av to expo-audio (SDK 54 requirement)
6. Implement push notification handlers
