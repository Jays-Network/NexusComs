# Mobile Chat Application - Stream Migration

## Overview
This project is a production-ready mobile chat application built with Expo React Native. Its primary purpose is to provide real-time chat, messaging, and video functionality, leveraging Stream (getstream.io) for its core communication infrastructure. The application successfully migrated from a custom Supabase/Socket.io backend to Stream's robust platform, ensuring scalability and advanced features. Key capabilities include hierarchical group messaging, a robust emergency alert system, and secure user authentication.

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
- **Authentication**: Secure token generation via a dedicated Express.js backend, integrating with Supabase Auth and JWT sessions.
- **Chat/Messaging**: Utilizes Stream Chat SDK for real-time communication and hierarchical group messaging.
- **Emergency Alert System**: Features audio playback (requires `emergency.wav`), haptic feedback, full-screen pulsing animation, and a custom message field (`emergency: true`).
- **Location Tracking**: Implemented with `react-native-maps`, including a graceful fallback for Expo Go limitations.
- **File Sharing**: Integrates `expo-document-picker`.
- **Video Calling**: Leverages Stream Video SDK, though it is currently disabled for Expo Go to prevent Android crashes and requires EAS build for activation.
- **Push Notifications**: Configured using `expo-notifications`.
- **State Management**: Primarily uses React hooks and Stream context.
- **Local Storage**: `AsyncStorage` is used for user session management.
- **Security**:
    - **Runtime Security**: Includes Helmet middleware (CSP, X-Frame-Options, XSS protection), rate limiting on authentication and general API endpoints, restrictive CORS, and body-size limits.
    - **Dependency Vulnerability Monitoring**: `npm audit` runs on server startup, logging and alerting for critical/high vulnerabilities.
    - **Security Dashboard**: Provides secret scanning, dependency auditing, API traffic monitoring, system integrity checks, and security recommendations.
    - **Authentication Flow**: Secure, server-side generation of Stream tokens with the Stream API secret never exposed to the client.

### System Design Choices
- **Hierarchical Group Messaging**: Implemented with parent-child group relationships and channel filtering based on `stream_channel_id`.
- **Database Integration**: Supabase is used as the primary database, with a `stream_id` column linking Supabase users to Stream.
- **Deployment**: Frontend is deployed on Expo.dev, and the backend on Replit, with Supabase PostgreSQL as the database.
- **Database Schema**: Includes tables for users, accounts (with hierarchy, billing plans, roles), and `account_channels` for linking accounts to Stream channels.

## External Dependencies

- **Chat/Messaging/Video**: Stream (getstream.io)
- **Database**: Supabase (PostgreSQL, Auth)
- **Frontend Framework**: Expo React Native
- **Navigation**: React Navigation 7+
- **Mapping**: `react-native-maps`
- **File Picker**: `expo-document-picker`
- **Notifications**: `expo-notifications`
- **Audio Playback**: `expo-av` (note: deprecated, `expo-audio` migration pending)
- **Backend Framework**: Express.js
- **Security Middleware**: Helmet
- **Authentication (Backend)**: Stream Chat SDK (server-side), bcrypt (for password hashing)
- **Email Service**: Brevo SMTP (for password reset emails)