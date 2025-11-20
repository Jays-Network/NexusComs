# Mobile Chat Application - Stream Migration

## Overview
Production-ready mobile chat application built with Expo React Native, using Stream (getstream.io) for chat, messaging, and video functionality. Successfully migrated from custom Supabase/Socket.io backend to Stream's infrastructure.

## Recent Changes (November 20, 2025)
- ✅ **Repository Cleanup**: Removed archive files, organized documentation
  - Moved all documentation to /docs folder (FRONTEND_README.md, BACKEND_README.md, BACKEND_SETUP.md, GITHUB_UPLOAD_GUIDE.md)
  - Created comprehensive main README.md for GitHub
  - Updated .gitignore to exclude archives, logs, and sensitive files
  - Fixed all documentation to match Expo SDK 54 and actual dependencies
  - Documented NativeWind as installed but unused (uses StyleSheet API instead)

## Previous Changes (November 18, 2025)
- ✅ **Emergency Alert System**: Complete implementation with audio, haptics, and visual feedback
  - Properly handles successive alerts, even during acknowledgement fade-out
  - iOS silent mode bypass for emergency audio
  - Comprehensive resource cleanup (sound, animation, timeouts)
  - **Note**: Requires actual emergency.wav file in `assets/sounds/` directory
- ✅ **Critical Fix**: Disabled Stream Video SDK to prevent Android crashes in Expo Go
  - WebRTC import was causing device crashes (7000+ frame drops)
  - Video features now safely disabled until building with EAS
  - Chat functionality remains fully operational

## Project Architecture

### Core Components
- **Frontend**: Expo React Native app (port 8081)
- **Backend**: Express.js authentication server (port 3000) with web UI

### Core Screens
- **LoginScreen**: User authentication using secure backend-issued tokens
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
- **Backend**: Express.js, Stream Chat SDK (server-side)
- **Chat/Messaging**: Stream Chat SDK
- **Video**: Stream Video SDK (disabled in Expo Go)
- **State Management**: React hooks, Stream context
- **Storage**: AsyncStorage for user sessions
- **Audio**: expo-av (deprecated, migration to expo-audio pending)

## Important Files
### Frontend
- `utils/streamClient.ts`: Stream client initialization
- `utils/streamAuth.tsx`: Authentication context provider
- `utils/streamApi.ts`: Backend API client for token generation
- `components/EmergencyModal.tsx`: Emergency alert modal component
- `screens/ChatRoomScreen.tsx`: Main chat interface
- `App.tsx`: Root component with ErrorBoundary

### Backend
- `backend/src/server.js`: Express server with authentication endpoints
- `backend/public/index.html`: Web UI for testing authentication
- `start-backend.sh`: Backend server startup script
- `start-dev.sh`: Run both frontend and backend concurrently

## Security Notes
- ✅ **Production-Ready Authentication**: Backend server securely generates Stream tokens
- ✅ **API Secret Protected**: Stream API secret NEVER exposed to client
- ✅ **Secure Token Flow**: Tokens generated server-side and sent to clients
- ℹ️ **Backend Required**: Must run backend server for authentication to work

## Running the Application
See `BACKEND_SETUP.md` for detailed instructions. Quick start:
1. In a Shell tab, run: `./start-backend.sh` (backend on port 3000)
2. Access backend web UI at http://localhost:3000 for testing
3. Main workflow automatically runs frontend (Expo on port 8081)
4. Or use `./start-dev.sh` to run both together

## Known Limitations
1. **WebRTC (video calling) DISABLED for Expo Go** - Import commented out to prevent Android crashes
   - To enable: Build with EAS, then uncomment import in `utils/streamClient.ts`
2. react-native-maps doesn't work in Expo Go - graceful fallback implemented
3. emergency.wav audio file needs to be added to assets/sounds/ directory
4. expo-av is deprecated - migration to expo-audio recommended for SDK 54+

## Important: Video Features
Stream Video SDK is currently **disabled** because it causes severe crashes on Android devices when running in Expo Go (WebRTC incompatibility). To enable video features:
1. Build the app using EAS (see EAS setup section)
2. Uncomment the StreamVideoClient import in `utils/streamClient.ts`
3. The app will then support video calling on physical devices

## Testing
- User has Expo account for physical device testing via QR code
- Web version available but may differ from iOS/Android native experience
- Recommended testing on actual iOS/Android devices through Expo Go

## User Preferences
- No specific coding style preferences documented yet
- Design follows iOS 26 Liquid Glass interface guidelines
- No emoji usage in the application

## Recent Updates (November 19, 2025)
- ✅ **Backend Authentication Server**: Implemented Express.js backend for secure token generation
  - Endpoint: `POST /api/auth/stream-token`
  - Stream API secret kept secure on server-side only
  - User sanitization and validation
- ✅ **Backend Web UI**: Professional web interface for testing authentication
  - Access at http://localhost:3000 when backend is running
  - Generate tokens via web form
  - Real-time server status indicator
  - Formatted JSON responses
- ✅ **Updated Branding**: World Risk logo added to app icon, splash screen, and login screen
- ✅ **Production-Ready Security**: No more client-side dev tokens

## Next Steps (Future Enhancements)
1. Add actual emergency.wav audio file
2. Add location sharing functionality to chat
3. Complete video calling setup with Stream Video SDK (requires EAS build)
4. Migrate from expo-av to expo-audio (SDK 54 requirement)
5. Implement push notification handlers
6. Set up automated concurrent workflow execution
