# WorldRisk Nexus Coms

Production-ready mobile chat application built with Expo React Native and CometChat, featuring real-time group messaging, emergency alert system, and secure backend authentication.

## Overview

WorldRisk Nexus Coms is an enterprise-grade mobile communication platform designed for teams that need reliable real-time messaging with emergency alert capabilities. Built with modern technologies and security best practices.

## Features

### Core Messaging
- **Real-time Chat**: Powered by CometChat SDK for instant messaging
- **Hierarchical Groups**: Organized group structure with parent-child relationships
- **Direct Messaging**: One-to-one private conversations
- **File Sharing**: Share images, documents, and videos
- **Message History**: Complete chat history with CometChat infrastructure
- **Typing Indicators**: See when others are typing
- **Read Receipts**: Track message delivery and read status

### Emergency Alert System
- **Critical Alerts**: Send emergency notifications to entire groups
- **Audio Alerts**: Custom emergency sound with iOS silent mode bypass
- **Haptic Feedback**: Triple heavy impact vibration pattern
- **Full-Screen Modal**: Unmissable emergency notification display
- **Visual Feedback**: Pulsing animation for urgent attention
- **Alert History**: View all past emergency alerts

### Location Features
- **Live Location Sharing**: Share real-time location with 15-minute or 1-hour duration
- **Map Visualization**: View shared locations on interactive maps
- **Team Tracking**: See team member locations in group context

### Security & Authentication
- **Backend Token Generation**: Secure CometChat tokens issued server-side
- **Protected API Secrets**: CometChat API secret never exposed to clients
- **User Validation**: Sanitized user IDs and input validation
- **Production Ready**: Proper authentication flow with JWT tokens
- **Helmet Security Headers**: CSP, X-Frame-Options, XSS protection
- **Rate Limiting**: Protection against brute force attacks
- **CORS Restrictions**: Configurable origin whitelist

### User Experience
- **iOS 26 Liquid Glass UI**: Modern, native-feeling interface design
- **Responsive Layout**: Optimized for all mobile devices
- **Error Boundaries**: Graceful error handling with app recovery
- **Safe Area Support**: Proper insets for all device types
- **Tab Navigation**: Easy access to Groups, Chats, Emergency, Contacts, Call Log, and Settings

## Tech Stack & Hosting

### Frontend (Expo.dev)
- **Expo SDK 54**: React Native framework
- **CometChat SDK**: Real-time messaging infrastructure
- **React Navigation 7**: Navigation system
- **AsyncStorage**: Local data persistence
- **Expo AV**: Audio/video playback for alert sounds
- **Expo Haptics**: Vibration feedback
- **React Native Maps**: Map visualization
- **Expo Location**: GPS and location services

### Backend (Replit)
- **Express.js**: REST API server
- **CometChat Server SDK**: Secure token generation
- **Node.js**: Runtime environment
- **Admin Dashboard**: Web-based user management

### Database (Supabase)
- **PostgreSQL**: Relational database
- **Supabase Client**: Database access layer
- **Real-time subscriptions**: Live data updates

## Monorepo Structure

```
worldrisk-nexus/
├── frontend/                  # Expo React Native app
│   ├── App.tsx               # Root application component
│   ├── app.json              # Expo configuration
│   ├── package.json          # Frontend dependencies
│   │
│   ├── screens/              # Application screens
│   │   ├── LoginScreen.tsx   # User authentication
│   │   ├── GroupListScreen.tsx # Group listing
│   │   ├── ChatRoomScreen.tsx # Main chat interface
│   │   ├── EmergencyListScreen.tsx # Emergency alerts
│   │   ├── ContactsScreen.tsx # Contact management
│   │   ├── CallLogScreen.tsx # Call history
│   │   └── SettingsScreen.tsx # User settings
│   │
│   ├── components/           # Reusable components
│   │   ├── EmergencyModal.tsx # Emergency alert modal
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   └── ...
│   │
│   ├── navigation/           # Navigation configuration
│   ├── utils/                # Utilities and helpers
│   │   ├── cometChatClient.ts # CometChat SDK initialization
│   │   ├── cometChatAuth.tsx # Authentication context
│   │   └── api.ts            # Backend API client
│   │
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom React hooks
│   ├── constants/            # Theme and constants
│   ├── assets/               # Images, sounds, fonts
│   └── scripts/              # Build scripts
│
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── server.js         # Express server
│   │   ├── routes/
│   │   │   └── security.js   # Security dashboard API
│   │   ├── middleware/
│   │   │   └── securityMonitor.js  # API traffic monitoring
│   │   └── utils/
│   │       └── alerts.js     # Security alerts system
│   ├── public/
│   │   └── index.html        # Admin dashboard UI
│   ├── package.json          # Backend dependencies
│   └── supabase-schema.sql   # Database schema
│
├── docs/                     # Documentation
│   ├── design_guidelines.md  # UI/UX design guidelines
│   ├── BACKEND_README.md     # Backend documentation
│   ├── BACKEND_SETUP.md      # Backend setup guide
│   ├── BACKEND_SETUP_SUPABASE.md # Supabase configuration
│   ├── QUICK_START_BACKEND.md # Quick start guide
│   ├── SECURITY.md           # Security policy
│   └── replit.md             # Project memory
│
├── README.md                 # This file
└── .gitignore               # Git ignore rules
```

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo account (free)
- CometChat account with API credentials
- Supabase account with database
- Mobile device with Expo Go app installed

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/Jays-Network/NexusComs.git
cd NexusComs

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Setup

**Frontend environment variables (configured in Replit):**
```env
EXPO_PUBLIC_COMETCHAT_APP_ID=your_app_id
EXPO_PUBLIC_COMETCHAT_REGION=eu
EXPO_PUBLIC_COMETCHAT_AUTH_KEY=your_auth_key
EXPO_PUBLIC_API_URL=https://your-backend.replit.app
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Backend environment variables:**
```env
COMETCHAT_APP_ID=your_app_id
COMETCHAT_API_KEY=your_api_key
COMETCHAT_REGION=eu
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SESSION_SECRET=your_session_secret
```

> Never commit `.env` files or secrets to git!

### 3. Get CometChat Credentials

1. Create account at [cometchat.com](https://www.cometchat.com)
2. Create a new app
3. Copy App ID, Auth Key, and API Key from dashboard
4. Add to environment variables

### 4. Start the Application

```bash
# Terminal 1 - Backend
cd backend
node src/server.js

# Terminal 2 - Frontend
cd frontend
npx expo start
```

### 5. Access the Application

- **Mobile App**: Scan QR code with Expo Go
- **Admin Dashboard**: https://your-backend.replit.app
- **Health Check**: https://your-backend.replit.app/health

## Development

### Running on Device

1. Install Expo Go on your iOS/Android device
2. Start dev server: `cd frontend && npx expo start`
3. Scan QR code with Expo Go (Android) or Camera app (iOS)

### Admin Dashboard

Manage users and settings:
1. Start backend: `cd backend && node src/server.js`
2. Open browser to backend URL
3. Login with admin credentials

## Building for Production

### Frontend (Mobile App)

```bash
cd frontend

# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit
```

### Backend

Deploy to Replit:
1. Push changes to prod-backend branch
2. Configure environment secrets in Replit
3. Deploy using Replit's deployment feature

## Git Branch Strategy

- **dev-backend** / **dev-frontend**: Active development
- **preview-backend** / **preview-frontend**: Staging/testing
- **prod-backend** / **prod-frontend**: Production deployments

## Known Limitations

1. **Video Calling**: CometChat Video requires EAS build (not available in Expo Go)
2. **Maps**: react-native-maps has limited Expo Go support
3. **Background Location**: Requires development build for full functionality

## Troubleshooting

### Authentication Issues
- Ensure backend is running and accessible
- Verify CometChat API credentials are correct
- Check `EXPO_PUBLIC_API_URL` points to backend

### App Won't Start
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start -c`
- Restart Metro bundler

### CometChat Connection Fails
- Verify App ID and Auth Key in environment
- Check backend token generation works
- Ensure CometChat region matches your app configuration

## Security

### Security Practices
- Never commit `.env` files or API secrets
- Use environment variables for all sensitive data
- Keep dependencies updated regularly
- Review security advisories

### Security Dashboard
Access the Security Dashboard at backend URL after logging in:
- **Secrets Scanner**: Scans codebase for exposed credentials
- **NPM Dependency Audit**: Vulnerability scanning
- **API Traffic Monitor**: Real-time request tracking
- **System Integrity Check**: File hash verification

## Documentation

Detailed documentation available in the `/docs` folder:

- **[Backend Setup Guide](docs/BACKEND_README.md)** - Backend API documentation
- **[Supabase Setup](docs/BACKEND_SETUP_SUPABASE.md)** - Database configuration
- **[Security Policy](docs/SECURITY.md)** - Security practices and reporting
- **[Design Guidelines](docs/design_guidelines.md)** - UI/UX standards

## License

Proprietary - WorldRisk Nexus Coms Application

## Support

For support and questions:
- Review documentation in `/docs` folder
- Check CometChat documentation: [cometchat.com/docs](https://www.cometchat.com/docs/)
- Review Expo documentation: [docs.expo.dev](https://docs.expo.dev/)

---

**Version:** 2.0  
**Last Updated:** December 2025  
**Maintainer:** WorldRisk Nexus Coms Team
