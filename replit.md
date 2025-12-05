# WorldRisk Nexus Coms - Mobile Chat Application

## Overview

WorldRisk Nexus Coms is a production-ready enterprise mobile communication platform built with Expo React Native. It provides real-time group messaging, emergency alert capabilities, and secure authentication for teams requiring reliable communication infrastructure. The application features hierarchical group organization, file sharing, location tracking, and a comprehensive emergency notification system with audio alerts and haptic feedback.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Choice: Expo SDK 54**
- **Rationale**: Provides managed workflow with over-the-air updates, simplified native module integration, and cross-platform compatibility (iOS, Android, Web)
- **Trade-offs**: Some native features (video calling, advanced maps) require EAS builds rather than Expo Go
- **Design Pattern**: Component-based architecture with custom themed components and screen-specific navigators

**Navigation Structure: React Navigation 7**
- **Implementation**: Bottom tab navigation with nested stack navigators for each major section (Chats, Groups, Emergency, Contacts, Call Log, Settings)
- **Platform Optimization**: iOS uses BlurView for tab bar transparency with native feel; Android uses solid backgrounds
- **Gesture Support**: Liquid Glass gestures when available, standard horizontal swipes otherwise

**UI/UX Framework: Custom Theme System**
- **Approach**: StyleSheet-based components with comprehensive theming (light/dark modes)
- **Rationale**: Predictable performance over utility-first CSS (NativeWind installed but unused)
- **Design Language**: iOS 26 Liquid Glass interface guidelines with safe area handling
- **Components**: Reusable themed wrappers (ThemedText, ThemedView, Button, Card) for consistency

**State Management Strategy**
- **Local State**: React hooks (useState, useEffect, useCallback) for component-level data
- **Shared State**: Context API for cross-cutting concerns (Theme, Settings, Auth)
- **Persistent Storage**: AsyncStorage for user preferences and session data
- **Real-time Sync**: CometChat SDK with custom React context for message/user updates

### Backend Architecture

**Server Framework: Express.js**
- **Purpose**: Authentication token generation, user management, and API gateway
- **Security Middleware**: Helmet (CSP, XSS protection), rate limiting, CORS restrictions
- **Session Management**: JWT tokens with configurable expiration (7-day default)

**Authentication Flow**
- **Design**: Server-side token generation prevents API secret exposure to clients
- **Process**: User credentials → Backend validation → CometChat auth token → Client connection
- **Password Security**: Bcrypt hashing with salt rounds
- **Password Reset**: Time-limited tokens (1-hour expiration) with email/username verification

**Admin Interface**
- **Implementation**: Static HTML/CSS/JavaScript dashboard served from backend
- **Features**: User CRUD operations, tabbed interface (General/Access/Advanced), session management
- **Access Control**: JWT-based session middleware protecting admin endpoints

### Data Storage Solutions

**Primary Database: Supabase PostgreSQL**
- **Schema Design**: 
  - `users` table with CometChat UID mapping (`cometchat_uid` column)
  - `groups` and `emergency_groups` with hierarchical parent-child relationships
  - `group_members` and `emergency_group_members` junction tables with unique constraints
  - Indexed foreign keys for query optimization
- **Rationale**: Managed PostgreSQL with built-in auth, real-time subscriptions, and RESTful API
- **Connection Pattern**: Service role key for server operations, anon key for client queries (not currently utilized)

**Real-time Messaging: CometChat**
- **Group Architecture**: Groups follow `group-{supabase_id}` naming pattern for database synchronization
- **Message Types**: Text, media (images/video/audio), custom (emergency alerts, location, contacts, polls, events)
- **Metadata Strategy**: Emergency messages tagged with `emergency: true` for special handling
- **Conversation Types**: Group chats and one-to-one direct messaging

**Client Storage: AsyncStorage**
- **Use Cases**: Theme preferences, app settings, session tokens (currently JWT, could migrate to expo-secure-store)
- **Data Serialization**: JSON strings for complex objects
- **Persistence**: Survives app restarts but not reinstallation

### Authentication & Authorization

**Multi-layered Auth System**
- **Level 1 - Backend Auth**: Email/password login with bcrypt-hashed credentials in Supabase
- **Level 2 - Session Tokens**: JWT tokens for backend API authentication
- **Level 3 - CometChat Auth**: Server-generated auth tokens for real-time messaging
- **User Linking**: `cometchat_uid` column synchronizes Supabase users with CometChat identities

**Security Measures**
- **Token Isolation**: API secrets never exposed to frontend (env variables with EXPO_PUBLIC_ prefix only for non-secret keys)
- **Rate Limiting**: Express middleware on authentication and general API endpoints
- **Input Validation**: User ID sanitization, input length limits
- **Password Policies**: Minimum 6 characters (configurable), reset token expiration
- **CORS Policy**: Configurable origin whitelist for cross-origin requests

### External Dependencies

**CometChat Real-time Infrastructure**
- **SDK**: @cometchat/chat-sdk-react-native for messaging, user presence, typing indicators
- **Video SDK**: @stream-io/video-react-native-sdk (installed but requires EAS build activation)
- **Configuration**: APP_ID, REGION, AUTH_KEY (frontend), API_KEY (backend secret)
- **Features Used**: Group chat, direct messaging, file attachments, custom messages, message listeners

**Supabase Backend-as-a-Service**
- **Client Library**: @supabase/supabase-js v2.84.0
- **Services**: PostgreSQL database, potential for auth/storage (database-only currently active)
- **Environment Variables**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

**Push Notifications: Expo Notifications**
- **Implementation**: expo-notifications with expo-server-sdk backend support
- **Configuration**: Notification handler with iOS silent mode bypass for emergency alerts
- **Permissions**: Requested at runtime, graceful degradation if denied

**Location Services: Expo Location + React Native Maps**
- **Location Tracking**: expo-location for GPS coordinates with accuracy metadata
- **Map Visualization**: react-native-maps (requires EAS build, graceful fallback in Expo Go)
- **Permissions**: Platform-specific (NSLocationWhenInUseUsageDescription for iOS)
- **Use Case**: Real-time team location sharing in group context

**Media Handling**
- **Image Picker**: expo-image-picker for camera and photo library access
- **Document Picker**: expo-document-picker for file attachments
- **Audio Playback**: expo-av for emergency alert sounds with silent mode override
- **File System**: expo-file-system for media operations

**Device Integration**
- **Haptics**: expo-haptics for tactile feedback (triple heavy impact on emergency alerts)
- **Contacts**: expo-contacts for contact sharing functionality
- **Clipboard**: expo-clipboard for copy/paste operations
- **Image Optimization**: expo-image for performant image rendering

**Security & Monitoring**
- **Dependency Auditing**: Automated npm audit on server startup with vulnerability logging
- **Security Dashboard**: Admin panel feature for real-time security monitoring
- **Helmet Middleware**: HTTP security headers (CSP, X-Frame-Options, HSTS)
- **Rate Limiter**: express-rate-limit for brute force protection

**Development & Build Tools**
- **EAS Build**: Expo Application Services for native builds (required for maps, video calling)
- **Concurrently**: Parallel execution of frontend and backend dev servers
- **TypeScript**: Type safety with path aliases (@/ prefix for imports)
- **Babel**: Module resolution with react-native-reanimated plugin