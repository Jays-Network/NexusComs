# WorldRisk Nexus Coms - Mobile Chat Application

## Overview

WorldRisk Nexus Coms is a production-ready mobile communication platform built with Expo React Native and CometChat. The application provides enterprise-grade real-time messaging, emergency alert capabilities, and secure authentication for teams requiring reliable communication infrastructure. The system consists of a mobile frontend (Expo) and a Node.js/Express backend with an integrated admin dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture (Expo React Native)

**Technology Stack:**
- **Framework:** Expo SDK 54 with React Native
- **Navigation:** React Navigation 7+ with native stack and bottom tabs
- **Chat SDK:** CometChat SDK for React Native (replacing Stream.io)
- **State Management:** React hooks, Context API (CometChatAuthProvider, SupabaseSyncProvider)
- **Styling:** React Native StyleSheet API with iOS 26 Liquid Glass design guidelines
- **Storage:** AsyncStorage for local persistence, expo-secure-store for sensitive data

**Key Design Decisions:**
- Tab-based navigation with 6 main tabs: Direct Chats, Groups, Alerts, Contacts, Call Log, Settings
- Error boundary implementation for graceful error handling and app recovery
- Safe area insets properly handled across all device types
- Platform-specific rendering (iOS/Android/Web) with web compatibility fallbacks

**Emergency Alert System:**
- Custom emergency modal with audio playback (`emergency.wav`), haptic feedback (triple heavy impact), and full-screen pulsing animation
- Message metadata field (`emergency: true`) distinguishes emergency messages
- Real-time emergency message listener using CometChat SDK
- iOS silent mode bypass for critical alerts

### Backend Architecture (Node.js/Express)

**Technology Stack:**
- **Framework:** Express.js with middleware for security and monitoring
- **Authentication:** Supabase Auth with JWT sessions (7-day expiration)
- **Database:** Supabase PostgreSQL
- **Security:** Helmet (CSP, X-Frame-Options, XSS protection), express-rate-limit, CORS restrictions
- **Real-time:** CometChat server-side integration for secure token generation

**Key Design Decisions:**
- Hybrid API service: serves both mobile API endpoints and admin CMS dashboard
- Server-side CometChat token generation to protect API secrets from client exposure
- Static file serving for admin dashboard (`backend/public/index.html`)
- Dynamic URL construction for password reset links (supports Replit deployment environments)
- Automated npm audit on server startup with vulnerability logging
- Security dashboard for secret scanning, dependency auditing, and API traffic monitoring

**Authentication Flow:**
1. User credentials validated against Supabase
2. JWT session token issued (7-day expiration)
3. CometChat auth token generated server-side
4. User synchronized between Supabase and CometChat (`cometchat_uid` column)

**Admin Dashboard:**
- User management interface with CRUD operations
- Tabbed interface (General, Access, Advanced) for user properties
- Session-based authentication with secure login page
- Direct Supabase integration for real-time data updates

### Database Schema (Supabase PostgreSQL)

**Core Tables:**
- **users:** Authentication and profile data with `cometchat_uid` linking to CometChat
- **groups:** Hierarchical group structure with parent-child relationships
- **group_members:** Junction table for group membership with user tracking
- **emergency_groups:** Dedicated tables for emergency alert groups
- **emergency_group_members:** Emergency group membership tracking

**Schema Features:**
- UUID primary keys for users (Supabase auth integration)
- BIGSERIAL for group IDs
- Foreign key constraints with CASCADE delete
- Indexed columns for performance (group_id, user_id lookups)
- JSONB permissions column for flexible role-based access control

### CometChat Integration

**Architecture Pattern:**
- CometChat group IDs follow pattern: `group-{supabase_id}` for consistency
- User synchronization: Supabase user creation triggers CometChat user creation
- Server-side token generation prevents API key exposure
- CometChat metadata used for hierarchical group tracking

**Required Environment Variables:**
- `COMETCHAT_APP_ID`: Application identifier
- `COMETCHAT_REGION`: Deployment region (us/eu)
- `COMETCHAT_AUTH_KEY`: Frontend authentication key
- `COMETCHAT_API_KEY`: Backend API key (secret)

### Security Architecture

**Runtime Security:**
- Helmet middleware with Content Security Policy
- Rate limiting on authentication endpoints and general API routes
- CORS whitelist with configurable allowed origins
- Request body size limits to prevent payload attacks
- Input sanitization for user IDs and credentials

**Dependency Security:**
- Automated `npm audit` on server startup
- Critical/high vulnerability alerts logged to `backend/logs/npm-audit.log`
- Security dashboard endpoints for on-demand scanning
- CI/CD integration recommendations for continuous monitoring

**Session Management:**
- JWT tokens with configurable expiration
- Secure password hashing with bcrypt
- Password reset tokens with 1-hour expiration
- One-time use tokens (cleared after successful reset)

## External Dependencies

### Third-Party Services

**CometChat (Primary Chat Service):**
- Real-time messaging infrastructure
- Group chat with hierarchical support
- User presence and typing indicators
- Message history and read receipts
- Server-side authentication token generation

**Supabase (Database & Auth):**
- PostgreSQL database hosting
- Built-in authentication system
- Service role API for admin operations
- Anon key for client-side operations
- Real-time subscriptions for data sync

**Expo Services:**
- Expo.dev hosting for mobile frontend
- Push notification service (expo-notifications)
- OTA updates capability
- EAS Build for native compilation

### Key NPM Packages

**Frontend:**
- `@cometchat/chat-sdk-react-native`: Chat functionality
- `@react-navigation/native`: Navigation system
- `@supabase/supabase-js`: Database client
- `expo-av`, `expo-audio`: Emergency alert sounds
- `expo-haptics`: Vibration feedback
- `expo-location`: Location tracking
- `react-native-maps`: Map integration

**Backend:**
- `express`: Web server framework
- `@supabase/supabase-js`: Database operations
- `helmet`: Security headers
- `express-rate-limit`: Rate limiting
- `bcrypt`: Password hashing
- `jsonwebtoken`: JWT token generation
- `cors`: Cross-origin resource sharing

### Deployment Infrastructure

**Frontend Deployment:**
- Platform: Expo.dev
- Environment: Expo Go (development) or EAS Build (production)
- Dynamic URL construction via `REPLIT_DEV_DOMAIN` for development

**Backend Deployment:**
- Platform: Replit
- Command: `node backend/src/server.js`
- Static file serving: `backend/public/` directory
- Environment variables via Replit Secrets

**Database:**
- Hosted: Supabase cloud PostgreSQL
- Connection: Service role key for backend, anon key for frontend
- Schema management: SQL migrations via Supabase SQL Editor