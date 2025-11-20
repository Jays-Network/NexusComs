# World Risk

Production-ready mobile chat application built with Expo React Native and Stream.io, featuring real-time group messaging, emergency alert system, and secure backend authentication.

![World Risk](assets/images/world-risk-logo.png)

## Overview

World Risk is an enterprise-grade mobile communication platform designed for teams that need reliable real-time messaging with emergency alert capabilities. Built with modern technologies and security best practices.

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

## Tech Stack

### Frontend (`/` - Expo React Native)
- **Expo SDK 54**: React Native framework
- **Stream Chat SDK**: Real-time messaging infrastructure
- **React Navigation 7**: Navigation system
- **AsyncStorage**: Local data persistence
- **Expo AV**: Audio/video playback for alert sounds
- **Expo Haptics**: Vibration feedback
- **React Native Maps**: Map visualization
- **React Native Gesture Handler**: Touch interactions
- **React Native Reanimated**: Smooth animations

### Backend (`/backend` - Node.js)
- **Express.js**: REST API server
- **Stream Chat Server SDK**: Secure token generation
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment configuration
- **Web UI**: Professional testing interface

## Project Structure

```
world-risk/
├── App.tsx                    # Root application component
├── app.json                   # Expo configuration
├── package.json               # Frontend dependencies
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
│   │   └── server.js         # Express server
│   ├── public/
│   │   └── index.html        # Web UI
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

- Never commit `.env` files or API secrets
- Use environment variables for all sensitive data
- Keep dependencies updated regularly
- Review security advisories in GitHub

## License

Proprietary - World Risk Application

## Support

For support and questions:
- Review documentation in `/docs` folder
- Check Stream documentation: [getstream.io/chat/docs](https://getstream.io/chat/docs/)
- Review Expo documentation: [docs.expo.dev](https://docs.expo.dev/)

---

**Version:** 1.0  
**Last Updated:** November 20, 2025  
**Maintainer:** World Risk Team
