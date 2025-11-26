# Mobile Chat Application - Stream Migration

## Overview
Production-ready mobile chat application built with Expo React Native, using Stream (getstream.io) for chat, messaging, and video functionality. Successfully migrated from custom Supabase/Socket.io backend to Stream's infrastructure.

## Recent Changes (November 26, 2025)
- ✅ **Security Dashboard**: Comprehensive security monitoring and scanning features
  - Secret Scanner: Scans codebase for exposed API keys, passwords, and sensitive data
  - NPM Dependency Audit: Checks for vulnerable dependencies with severity breakdown
  - API Traffic Monitor: Real-time request tracking with error rate monitoring
  - System Integrity Check: File hash verification for critical backend files
  - Security Recommendations: Automatic security suggestions based on configuration
  - Security Alerts: Centralized alerting system with acknowledge/clear functionality
  - Access via "Security" tab in admin dashboard sidebar
- ✅ **Case-Insensitive Email Login**: All email lookups normalized to lowercase
  - Fixed send-code, verify-code, login, and password-reset endpoints
- ✅ **Database Verification**: Added `/api/db-check` endpoint with dashboard integration
  - Verifies all 7 tables with row counts and error reporting
  - "Run Database Check" button in dashboard Supabase card

## Previous Changes (November 25, 2025)
- ✅ **Stream Chat Login Fixed**: Backend now generates real JWT tokens using Stream SDK
  - Fixed critical bug where backend was returning mock tokens instead of real JWT tokens
  - Backend uses `StreamChat.getInstance()` with `createToken()` for proper token generation
  - Users can now successfully connect to Stream Chat
- ✅ **Supabase Real-time Sync**: Added `stream_id` column for linking Supabase users to Stream
  - Frontend queries use `stream_id` (e.g., "jullian_worldriskglobal_com") instead of UUID
  - User needs to populate `stream_id` column for their users in Supabase
- ✅ **Frontend Fixes**: 
  - streamAuth.tsx now stores sanitized Stream ID instead of Supabase UUID
  - supabaseClient.ts improved quote stripping for web bundler compatibility

## Previous Changes (November 20, 2025)
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
- `backend/src/routes/security.js`: Security dashboard API routes
- `backend/src/middleware/securityMonitor.js`: API traffic monitoring middleware
- `backend/src/utils/alerts.js`: Security alerts management utility
- `backend/public/index.html`: Web UI for testing authentication and admin dashboard
- `start-backend.sh`: Backend server startup script
- `start-dev.sh`: Run both frontend and backend concurrently

## Security Notes
- ✅ **Production-Ready Authentication**: Backend server securely generates Stream tokens
- ✅ **API Secret Protected**: Stream API secret NEVER exposed to client
- ✅ **Secure Token Flow**: Tokens generated server-side and sent to clients
- ℹ️ **Backend Required**: Must run backend server for authentication to work

## Running the Application

### Frontend Workflow (Automatic)
- **Workflow**: "Start application" 
- **Command**: `npm run dev`
- **Port**: 8081
- **Status**: Automatically runs when you open the project

### Backend Workflow (Manual Setup Required)
**IMPORTANT: You must set up a Backend Workflow for password reset emails to work!**

**To set up the Backend Workflow in Replit UI:**
1. Click on "Workflows" in the left sidebar (or look for workflow icon)
2. Click "Create Workflow" or "Add new workflow"
3. **Name**: `Backend Server`
4. **Command**: `node backend/src/server.js`
5. **Port**: 3000
6. Save and start the workflow

**Once started:**
- Backend runs on http://localhost:3000
- Admin Dashboard accessible at http://localhost:3000
- Password reset emails will send via Brevo SMTP
- REST API endpoints available for authentication and user management

**Alternative (Manual Shell):**
In a Shell tab, run: `bash start-backend.sh`
(Note: This won't have access to encrypted secrets, so emails won't send)

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
- ✅ **Updated Branding**: WorldRisk Nexus Coms logo added to app icon, splash screen, and login screen
- ✅ **Production-Ready Security**: No more client-side dev tokens

## November 21, 2025 - Complete Backend Overhaul

✅ **Backend Completely Rebuilt** with Supabase integration:
- Login page (Email/Password authentication)
- User management dashboard (Wialon CMS-style table)
- Tabbed edit interface (General, Access, Advanced tabs)
- Full CRUD operations with Supabase sync
- Role-based access control
- Session management with JWT tokens

✅ **New Database Schema**:
- Users table with permissions (JSONB)
- Billing plans and account management
- Creator tracking and audit timestamps
- Host mask configuration

✅ **Security**:
- Password hashing with bcrypt
- Bearer token authentication on all API endpoints
- Session expiration (7 days)
- No credentials exposed in frontend

## Deployment Architecture
- **Frontend**: Hosted on Expo.dev (React Native app for iOS/Android/Web)
- **Backend**: Hosted on Replit (Express.js + Supabase)
- **Database**: Supabase PostgreSQL (production data)
- **Authentication**: Supabase Auth + JWT sessions
- **Chat**: Stream Chat SDK (real-time messaging)

## Backend Deployment (Replit)

See `BACKEND_SETUP_SUPABASE.md` for complete setup instructions. Quick summary:

1. **Create Supabase Project** (supabase.com)
2. **Set up Database Schema** (run SQL in Supabase SQL Editor)
3. **Add Secrets** to Replit:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_ANON_KEY
   - SESSION_SECRET (already set)
4. **Create Admin User** (SQL insert or registration)
5. **Deploy via Publishing**:
   - Go to Publishing > Autoscale > Set up published app
   - Configure machine power and publish
   - Get your backend URL: https://[replit-name].replit.dev

## Frontend Deployment (Expo.dev)
1. Push code to GitHub
2. Create Expo account (expo.dev)
3. Run: eas init, eas build --platform web/ios/android
4. Configure EXPO_PUBLIC_API_URL to your Replit backend
5. Add Supabase credentials to build environment

## Required Environment Variables

**For Backend (Replit Secrets):**
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY
- SESSION_SECRET
- STREAM_API_KEY (optional, for legacy endpoints)
- STREAM_API_SECRET (optional, for legacy endpoints)

**For Frontend (Expo Build Settings):**
- EXPO_PUBLIC_API_URL (Replit backend URL)
- EXPO_PUBLIC_STREAM_API_KEY
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

## Database Setup: Accounts Feature

Run this SQL in your Supabase SQL Editor to enable the Accounts feature:

```sql
-- Create accounts table with hierarchy support
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  billing_plan VARCHAR(50) DEFAULT 'basic',
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create account_channels junction table
CREATE TABLE IF NOT EXISTS account_channels (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL,
  access_level VARCHAR(50) DEFAULT 'read_write',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, channel_id)
);

-- Add account_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_account_channels_account ON account_channels(account_id);
CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);
```

## Next Steps (Future Enhancements)
1. Add actual emergency.wav audio file
2. Add location sharing functionality to chat
3. Complete video calling setup with Stream Video SDK (requires EAS build)
4. Implement push notification handlers
5. Set up Supabase real-time synchronization
