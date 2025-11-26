# WorldRisk Nexus Coms

Production-ready mobile chat application built with Expo React Native and Stream.io, featuring real-time group messaging, emergency alert system, and secure backend authentication.

![WorldRisk Nexus Coms](assets/images/world-risk-logo.png)

## Overview

WorldRisk Nexus Coms is an enterprise-grade mobile communication platform designed for teams that need reliable real-time messaging with emergency alert capabilities. Built with modern technologies and security best practices.

## Features

### Core Messaging
- **Real-time Chat**: Powered by Stream Chat SDK for instant messaging
- **Hierarchical Groups**: Organized group structure with Stream channels
- **File Sharing**: Share images, documents, and videos
- **Message History**: Complete chat history with Stream's infrastructure
- **Typing Indicators**: See when others are typing
- **Read Receipts**: Track message delivery and read status

### Emergency Alert System
- **Critical Alerts**: Send emergency notifications to entire groups
- **Audio Alerts**: Custom emergency sound with iOS silent mode bypass
- **Haptic Feedback**: Triple heavy impact vibration pattern
- **Full-Screen Modal**: Unmissable emergency notification display
- **Visual Feedback**: Pulsing animation for urgent attention
- **Alert History**: View all past emergency alerts

### Security & Authentication
- **Backend Token Generation**: Secure Stream tokens issued server-side
- **Protected API Secrets**: Stream API secret never exposed to clients
- **User Validation**: Sanitized user IDs and input validation
- **Production Ready**: Proper authentication flow with JWT tokens

### User Experience
- **iOS 26 Liquid Glass UI**: Modern, native-feeling interface design
- **Responsive Layout**: Optimized for all mobile devices
- **Error Boundaries**: Graceful error handling with app recovery
- **Safe Area Support**: Proper insets for all device types
- **Tab Navigation**: Easy access to Groups, Chats, Emergency, and Settings

## Tech Stack & Hosting

### Frontend (Expo.dev)
- **Expo SDK 54**: React Native framework
- **Stream Chat SDK**: Real-time messaging infrastructure
- **React Navigation 7**: Navigation system
- **AsyncStorage**: Local data persistence
- **Expo AV**: Audio/video playback for alert sounds
- **Expo Haptics**: Vibration feedback
- **React Native Maps**: Map visualization

### Backend (Replit)
- **Express.js**: REST API server
- **Stream Chat Server SDK**: Secure token generation
- **Node.js**: Runtime environment

### Database (Supabase)
- **PostgreSQL**: Relational database
- **Supabase Client**: Database access layer
- **Real-time subscriptions**: Live data updates

## Project Structure

```
world-risk/
├── App.tsx                    # Root application component
├── app.json                   # Expo configuration
├── package.json               # Frontend dependencies
├── SECURITY.md                # Security policy and practices
│
├── screens/                   # Application screens
│   ├── LoginScreen.tsx       # User authentication
│   ├── GroupListScreen.tsx   # Group/channel listing
│   ├── ChatRoomScreen.tsx    # Main chat interface
│   ├── EmergencyListScreen.tsx # Emergency alerts
│   └── SettingsScreen.tsx    # User settings
│
├── components/                # Reusable components
│   ├── EmergencyModal.tsx    # Emergency alert modal
│   ├── ErrorBoundary.tsx     # Error handling
│   └── ...
│
├── navigation/                # Navigation configuration
├── utils/                     # Utilities and helpers
│   ├── streamClient.ts       # Stream SDK initialization
│   ├── streamAuth.tsx        # Authentication context
│   └── streamApi.ts          # Backend API client
│
├── backend/                   # Backend server
│   ├── src/
│   │   ├── server.js         # Express server (auto npm audit on start)
│   │   ├── routes/
│   │   │   └── security.js   # Security dashboard API
│   │   ├── middleware/
│   │   │   └── securityMonitor.js  # API traffic monitoring
│   │   └── utils/
│   │       └── alerts.js     # Security alerts system
│   ├── public/
│   │   └── index.html        # Admin dashboard UI
│   └── package.json          # Backend dependencies
│
├── docs/                      # Documentation
│   ├── FRONTEND_README.md    # Frontend setup guide
│   ├── BACKEND_README.md     # Backend setup guide
│   └── BACKEND_SETUP.md      # Detailed backend docs
│
└── assets/                    # Images, sounds, fonts
    ├── images/               # App icons and logos
    └── sounds/               # Alert sounds
```

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo account (free)
- Stream account with API credentials
- Mobile device with Expo Go app installed

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/world-risk.git
cd world-risk

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Setup

**Frontend `.env`:**
```env
EXPO_PUBLIC_STREAM_API_KEY=your_stream_api_key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Backend `backend/.env`:**
```env
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
PORT=3000
```

> ⚠️ **Never commit `.env` files to git!**

### 3. Get Stream Credentials

1. Create account at [getstream.io](https://getstream.io)
2. Create a new app
3. Copy API Key and API Secret from dashboard
4. Add to environment files

### 4. Start the Application

**Option 1: Start backend in separate terminal**
```bash
# Terminal 1 - Backend
./start-backend.sh

# Terminal 2 - Frontend
npm run dev
```

**Option 2: Start both together**
```bash
./start-dev.sh
```

### 5. Access the Application

- **Mobile App**: Scan QR code with Expo Go
- **Backend Web UI**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Development

### Running on Device

1. Install Expo Go on your iOS/Android device
2. Start dev server: `npm run dev`
3. Scan QR code with Expo Go (Android) or Camera app (iOS)

### Backend Web UI

Test authentication without the mobile app:
1. Start backend: `./start-backend.sh`
2. Open browser: http://localhost:3000
3. Use web form to generate tokens and test API

### Testing

```bash
# Run tests (when available)
npm test

# Type checking
npx tsc --noEmit
```

## Documentation

Detailed documentation available in the `/docs` folder:

- **[Frontend Setup Guide](docs/FRONTEND_README.md)** - Complete frontend documentation
- **[Backend Setup Guide](docs/BACKEND_README.md)** - Backend API documentation
- **[Backend Setup Details](docs/BACKEND_SETUP.md)** - Detailed backend configuration

## Building for Production

### Frontend (Mobile App)

```bash
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

Deploy to your preferred platform:
- Railway
- Render
- Heroku
- AWS EC2/ECS
- DigitalOcean

Update frontend `EXPO_PUBLIC_API_URL` to your production backend URL.

## Features in Detail

### Emergency Alert System

The emergency alert system provides critical communication capabilities:

- **Audio**: Custom emergency.wav sound (bypass silent mode on iOS)
- **Haptics**: 3x heavy impact vibration pattern
- **Visual**: Full-screen modal with pulsing red animation
- **Persistent**: Alerts remain until acknowledged
- **History**: View all emergency alerts in dedicated screen

### Stream Integration

Using Stream provides enterprise-grade features:

- **Scalability**: Cloud infrastructure handles millions of messages
- **Real-time**: WebSocket connections for instant updates
- **Reliability**: 99.99% uptime SLA
- **Security**: End-to-end encryption available
- **Features**: Reactions, threads, mentions, typing indicators

### Backend Authentication

Secure authentication architecture:

- **Server-Side Tokens**: Stream tokens generated on backend only
- **API Secret Protected**: Never exposed to client applications
- **User Validation**: Input sanitization and validation
- **Scalable**: Ready for production deployment

## Known Limitations

1. **Video Calling**: Stream Video SDK disabled in Expo Go (requires EAS build)
2. **Maps**: react-native-maps has limited Expo Go support
3. **Audio**: expo-av deprecated, migration to expo-audio recommended

## Troubleshooting

### Authentication Issues
- Ensure backend is running on port 3000
- Verify Stream API credentials are correct
- Check `EXPO_PUBLIC_API_URL` points to backend

### App Won't Start
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start -c`
- Restart Metro bundler

### Stream Connection Fails
- Verify API key in environment
- Check backend token generation works
- Test with backend web UI first

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## Security

### Security Practices
- Never commit `.env` files or API secrets
- Use environment variables for all sensitive data
- Keep dependencies updated regularly
- Review security advisories in GitHub

### Automated Dependency Vulnerability Monitoring

This project implements automated security scanning to detect vulnerable dependencies:

#### On Server Startup
- **Automatic npm audit**: Runs on every backend server start
- Logs vulnerability summary with severity counts (critical/high/moderate/low)
- Creates security alerts for critical or high-severity vulnerabilities
- **Audit log file**: `backend/logs/npm-audit.log` (persisted with timestamps)

#### Security Dashboard (Admin Panel)
Access the Security Dashboard at `http://localhost:3000` after logging in:

- **Secrets Scanner**: Scans codebase for exposed API keys, passwords, credentials
- **NPM Dependency Audit**: On-demand vulnerability scanning with severity breakdown
- **API Traffic Monitor**: Real-time request tracking and error rate monitoring
- **System Integrity Check**: File hash verification for critical backend files
- **Security Recommendations**: Automated security suggestions
- **Security Alerts**: Centralized alerting system

#### Manual Vulnerability Scanning
```bash
# Run npm audit manually
cd backend && npm audit

# Auto-fix vulnerabilities where possible
npm audit fix

# View detailed vulnerability report
npm audit --json
```

#### CI/CD Integration (Recommended)
Add to your CI pipeline for automated scanning on every push:
```yaml
# GitHub Actions example
- name: Security Audit
  run: |
    npm audit --audit-level=high
    cd backend && npm audit --audit-level=high
```

### Security Files
- `backend/src/routes/security.js` - Security API endpoints
- `backend/src/middleware/securityMonitor.js` - API traffic monitoring
- `backend/src/utils/alerts.js` - Security alert management
- `SECURITY.md` - Security policy and vulnerability reporting

## License

Proprietary - WorldRisk Nexus Coms Application

## Support

For support and questions:
- Review documentation in `/docs` folder
- Check Stream documentation: [getstream.io/chat/docs](https://getstream.io/chat/docs/)
- Review Expo documentation: [docs.expo.dev](https://docs.expo.dev/)

---

**Version:** 1.0  
**Last Updated:** November 26, 2025  
**Maintainer:** WorldRisk Nexus Coms Team
