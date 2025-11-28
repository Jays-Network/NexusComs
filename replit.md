# Mobile Chat Application - CometChat Migration

## Overview
This project is a production-ready mobile chat application built with Expo React Native. Its primary purpose is to provide real-time chat, messaging, and video functionality, leveraging CometChat for its core communication infrastructure. The application successfully migrated from Stream (getstream.io) to CometChat's platform, ensuring scalability and advanced features. Key capabilities include hierarchical group messaging, a robust emergency alert system, and secure user authentication.

## User Preferences
- No specific coding style preferences documented yet
- Design follows iOS 26 Liquid Glass interface guidelines
- No emoji usage in the application

## System Architecture

### Core Components
- **Frontend**: Expo React Native application.
- **Backend**: Express.js authentication server with a web UI.

### UI/UX Decisions
- Design adheres to iOS 26 Liquid Glass interface guidelines.
- Branding includes the WorldRisk Nexus Coms logo on the app icon, splash screen, and login screen.

### Technical Implementations
- **Authentication**: Secure token generation via a dedicated Express.js backend, integrating with Supabase Auth and JWT sessions. CometChat auth tokens are generated server-side.
- **Chat/Messaging**: Utilizes CometChat SDK for real-time communication and hierarchical group messaging.
- **Emergency Alert System**: Features audio playback (requires `emergency.wav`), haptic feedback, full-screen pulsing animation, and a custom message metadata field (`emergency: true`).
- **Location Tracking**: Implemented with `react-native-maps`, including a graceful fallback for Expo Go limitations.
- **File Sharing**: Integrates `expo-document-picker`.
- **Video Calling**: Leverages CometChat Calling SDK (requires EAS build for activation, disabled in Expo Go).
- **Push Notifications**: Configured using `expo-notifications`.
- **State Management**: Primarily uses React hooks and CometChat context (`CometChatAuthProvider`).
- **Local Storage**: `AsyncStorage` is used for user session management.
- **Security**:
    - **Runtime Security**: Includes Helmet middleware (CSP, X-Frame-Options, XSS protection), rate limiting on authentication and general API endpoints, restrictive CORS, and body-size limits.
    - **Dependency Vulnerability Monitoring**: `npm audit` runs on server startup, logging and alerting for critical/high vulnerabilities.
    - **Security Dashboard**: Provides secret scanning, dependency auditing, API traffic monitoring, system integrity checks, and security recommendations.
    - **Authentication Flow**: Secure, server-side generation of CometChat auth tokens with the API key never exposed to the client.

### System Design Choices
- **Hierarchical Group Messaging**: Implemented with parent-child group relationships and CometChat group metadata for hierarchy tracking.
- **Database Integration**: Supabase is used as the primary database, with a `cometchat_uid` column linking Supabase users to CometChat.
- **CometChat Group IDs**: Follow pattern `group-{supabase_id}` for consistency between database and CometChat.
- **Deployment**: Frontend is deployed on Expo.dev, and the backend on Replit, with Supabase PostgreSQL as the database.
- **Database Schema**: Includes tables for users (with `cometchat_uid`), accounts (with hierarchy, billing plans, roles), and `account_channels` for linking accounts to CometChat groups.

## CometChat Configuration

### Required Environment Variables
- `COMETCHAT_APP_ID`: CometChat application ID
- `COMETCHAT_REGION`: CometChat region (e.g., 'us', 'eu')
- `COMETCHAT_AUTH_KEY`: Frontend authentication key (for user login)
- `COMETCHAT_API_KEY`: Backend API key (for server-side operations)

### Key Files
- `utils/cometChatClient.ts`: CometChat SDK initialization and core functions
- `utils/cometChatAuth.tsx`: CometChat authentication provider (React Context)
- `utils/cometChatApi.ts`: CometChat API helper functions
- `backend/src/utils/cometchat.js`: Server-side CometChat SDK utilities

## External Dependencies

- **Chat/Messaging/Video**: CometChat SDK
- **Database**: Supabase (PostgreSQL, Auth)
- **Frontend Framework**: Expo React Native
- **Navigation**: React Navigation 7+
- **Mapping**: `react-native-maps`
- **File Picker**: `expo-document-picker`
- **Notifications**: `expo-notifications`
- **Audio Playback**: `expo-av`
- **Backend Framework**: Express.js
- **Security Middleware**: Helmet
- **Authentication (Backend)**: CometChat Chat SDK (server-side), bcrypt (for password hashing)
- **Email Service**: Brevo SMTP (for password reset emails)

## Recent Changes

### November 2024 - CometChat Migration
- Migrated from Stream (getstream.io) to CometChat for all real-time communication
- Created new CometChat utility files: `cometChatClient.ts`, `cometChatAuth.tsx`, `cometChatApi.ts`
- Updated all screens (ChatRoomScreen, GroupListScreen, DirectChatsScreen, EmergencyListScreen) to use CometChat SDK
- Updated App.tsx to use CometChatAuthProvider
- Backend now generates CometChat auth tokens instead of Stream tokens
- Database uses `cometchat_uid` column for user-CometChat mapping
