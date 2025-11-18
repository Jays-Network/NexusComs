# SecureChat - Enterprise Group Messaging App

A production-ready mobile chat application built with Expo React Native, featuring hierarchical group messaging, end-to-end encryption, emergency alerts, real-time location tracking, and administrative controls.

## Features

### Core Messaging
- **Hierarchical Group Structure**: Main groups with sub-groups for organized communication
- **End-to-End Encryption**: All messages encrypted with AES-256
- **Real-time Chat**: Socket.IO powered instant messaging
- **File Sharing**: Support for images, videos, and documents
- **Offline Support**: AsyncStorage caching for offline message access
- **Template-Locked Messages**: Enforce structured messaging for formal communications

### Emergency System
- **Emergency Alerts**: Broadcast critical messages to all group members
- **Full-Screen Modal**: Unmissable emergency notifications
- **Haptic Feedback**: Heavy impact vibrations for emergency alerts
- **Custom Sound**: Dedicated emergency alert sound
- **Acknowledgment Tracking**: Track who has seen emergency messages
- **Push Notifications**: Emergency and default notification channels

### Location & Maps
- **Real-time Location Tracking**: Background location updates (admin-controlled)
- **Group Map View**: See all members' locations on an interactive map
- **Location History**: Track location updates over time

### Security & Administration
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Admin and regular user roles
- **Secure Storage**: Expo SecureStore for sensitive data
- **Password Hashing**: bcrypt password protection

### User Experience
- **iOS 26 Liquid Glass UI**: Modern, native-feeling interface
- **Tab Navigation**: Easy access to Chats, Emergency, and Settings
- **Responsive Design**: Optimized for mobile devices
- **Safe Area Handling**: Proper insets for all device types
- **Error Boundaries**: Graceful error handling and app restart

## Tech Stack

### Frontend
- **Expo SDK 54**: React Native framework
- **React Navigation 7**: Navigation system
- **Socket.IO Client**: Real-time communication
- **Expo Location**: GPS and location services
- **React Native Maps**: Map visualization
- **Expo Notifications**: Push notification support
- **Expo Image Picker**: Photo and video selection
- **Expo Document Picker**: File selection
- **Expo Haptics**: Vibration feedback
- **Expo AV**: Audio playback for alerts
- **Crypto-JS**: Client-side encryption
- **Expo Secure Store**: Secure credential storage
- **AsyncStorage**: Local data caching

### Backend
- **Node.js + Express**: REST API server
- **Socket.IO**: WebSocket server for real-time features
- **Supabase (PostgreSQL)**: Cloud database
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **Multer**: File upload handling
- **CORS**: Cross-origin resource sharing

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Expo Go app on your mobile device (iOS or Android)
- Supabase account (free tier works fine)

### 1. Database Setup

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to the SQL Editor
3. Copy the contents of `supabase-schema.sql` and run it in the SQL Editor
4. This will create all necessary tables and seed demo data

**Demo Credentials:**
- Admin: `admin` / `admin123`
- User 1: `user1` / `demo123`
- User 2: `user2` / `demo123`

### 2. Environment Configuration

1. In Replit Secrets (lock icon in left sidebar), add the following:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=your_random_secret_key
```

2. Get your Supabase URL and anon key from:
   - Supabase Dashboard → Settings → API
   - Copy "Project URL" and "anon/public" key

3. For `SESSION_SECRET`, generate a random string (at least 32 characters)

4. Create a `.env` file (optional, for local development):

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the Backend Server

The backend server needs to run separately from the Expo app. Open a new Shell tab and run:

```bash
node server/server.js
```

The server will start on port 3000. Keep this running.

### 4. Start the Expo App

In the main Shell tab (or use the "Start application" workflow button):

```bash
npm run dev
```

This will start the Expo development server and display a QR code.

### 5. Test on Your Mobile Device

1. Install **Expo Go** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code:
   - iOS: Use the Camera app
   - Android: Use the Expo Go app scanner

3. The app will load on your device

4. Login with demo credentials:
   - Username: `admin`
   - Password: `admin123`

## Project Structure

```
├── App.tsx                      # Main app component with auth flow
├── navigation/                  # Navigation configuration
│   ├── MainTabNavigator.tsx    # Bottom tab navigator
│   ├── ChatsStackNavigator.tsx # Chats stack
│   ├── EmergencyStackNavigator.tsx
│   └── SettingsStackNavigator.tsx
├── screens/                     # App screens
│   ├── LoginScreen.tsx         # Authentication
│   ├── GroupListScreen.tsx     # Main groups and subgroups
│   ├── ChatRoomScreen.tsx      # Real-time chat
│   ├── EmergencyListScreen.tsx # Emergency alerts
│   ├── SettingsScreen.tsx      # User settings
│   └── GroupMapScreen.tsx      # Location tracking map
├── components/                  # Reusable components
│   ├── EmergencyModal.tsx      # Full-screen emergency alerts
│   ├── ThemedText.tsx          # Themed text component
│   ├── ThemedView.tsx          # Themed view component
│   ├── ErrorBoundary.tsx       # Error handling
│   └── Screen*.tsx             # Screen wrapper components
├── utils/                       # Utility functions
│   ├── auth.tsx                # Authentication context
│   ├── socket.ts               # Socket.IO + encryption
│   └── storage.ts              # AsyncStorage helpers
├── server/                      # Backend server
│   ├── server.js               # Express + Socket.IO server
│   └── database.js             # Supabase client
├── constants/                   # App constants
│   └── theme.ts                # Colors, spacing, typography
└── supabase-schema.sql         # Database schema

```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)

### Groups
- `GET /api/groups` - Get all groups with subgroups
- `GET /api/groups/:subgroupId/members` - Get subgroup members

### Messages
- `GET /api/messages/:subgroupId` - Get messages for a subgroup
- `POST /api/messages` - Send a message (use Socket.IO instead)

### Emergency
- `GET /api/emergency` - Get all emergency messages
- `POST /api/emergency/:messageId/acknowledge` - Acknowledge emergency

### Location
- `GET /api/location/group/:subgroupId` - Get member locations
- `POST /api/location` - Update user location

### File Upload
- `POST /api/upload` - Upload file (multipart/form-data)

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `join_room` - Join a subgroup room
- `leave_room` - Leave a subgroup room
- `send_message` - Send encrypted message
- `update_location` - Update user location

### Server → Client
- `new_message` - New message received
- `message_error` - Message send error
- `emergency_alert` - Emergency alert broadcast
- `location_update` - Member location updated

## Security Features

1. **End-to-End Encryption**:
   - All messages encrypted with AES-256
   - Encryption key stored securely
   - Decrypt only on client side

2. **Secure Authentication**:
   - JWT tokens with expiration
   - Passwords hashed with bcrypt (10 rounds)
   - Tokens stored in Expo SecureStore

3. **Authorization**:
   - JWT middleware on protected routes
   - Role-based access control
   - Admin-only features

4. **Data Protection**:
   - Environment variables for secrets
   - No sensitive data in logs
   - Secure WebSocket connections

## Development Notes

### Running Both Servers

You need to run TWO processes:

1. **Backend Server** (Terminal 1):
   ```bash
   node server/server.js
   ```

2. **Expo Dev Server** (Terminal 2):
   ```bash
   npm run dev
   ```

### Hot Module Reloading

The Expo app supports HMR - changes to React components will update automatically. However, you need to restart the backend server if you modify `server/server.js`.

### Debugging

- **Backend logs**: Check Terminal 1 (server.js)
- **App logs**: Check Expo dev tools or shake device → Debug Remote JS
- **Network**: Use React Native Debugger or Flipper

### Common Issues

**"Cannot connect to server"**:
- Make sure the backend server is running
- Check that `EXPO_PUBLIC_API_URL` is set correctly
- Ensure Supabase credentials are configured

**"WebSocket connection failed"**:
- Backend server must be running
- Check firewall settings
- Verify Socket.IO version compatibility

**Maps not working on web**:
- This is expected - react-native-maps doesn't support web
- Use Expo Go on a physical device to test maps

**Emergency sound not playing**:
- Add a real WAV file to `assets/sounds/emergency.wav`
- The placeholder file is just a text file

## Deployment

### Publishing the App

1. Build the app for production:
   ```bash
   npx expo build:android
   npx expo build:ios
   ```

2. Deploy the backend:
   - Use Replit deployments
   - Or deploy to Heroku, Railway, or any Node.js hosting

3. Update environment variables:
   - Set production Supabase credentials
   - Update `EXPO_PUBLIC_API_URL` to production backend URL
   - Generate new `SESSION_SECRET`

### Production Checklist

- [ ] Change all default passwords
- [ ] Use production Supabase database
- [ ] Enable SSL for backend API
- [ ] Configure push notification credentials
- [ ] Set up proper logging and monitoring
- [ ] Configure file storage (not local filesystem)
- [ ] Test emergency alerts thoroughly
- [ ] Review and audit security settings
- [ ] Set up database backups
- [ ] Configure proper CORS origins

## Future Enhancements

- Video calling integration (WebRTC or third-party service)
- Web admin dashboard for user management
- Message reactions and threading
- Voice messages
- Read receipts and typing indicators
- Group creation and management by users
- Enhanced search and filtering
- Analytics and reporting
- Multi-language support
- Dark mode theme switching
- Biometric authentication

## License

Private - Internal Use Only

## Support

For issues and questions, contact your system administrator.

---

**Important Security Notice**: This app handles sensitive communications and location data. Always follow security best practices, keep dependencies updated, and conduct regular security audits.
