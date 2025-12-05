# Design Guidelines: Mission-Critical Mobile Chat Application

## Authentication Architecture

**Auth Required** - This application requires robust authentication due to:
- Multi-user chat and group messaging
- Backend API integration with Socket.io
- Admin-controlled user management
- Location sharing and tracking features

**Auth Implementation:**
- **Username/Password only** (as specified - no SSO)
- Admin-controlled registration (closed signup)
- JWT tokens stored securely in expo-secure-store
- Login screen must include:
  - Username input field
  - Password input field (with show/hide toggle)
  - Login button (disabled until both fields are filled)
  - Error messaging area for invalid credentials
- NO sign-up flow for end users
- Account screen includes:
  - Profile settings (name, avatar)
  - Notification preferences
  - Location sharing toggle (when enabled by admin)
  - Log out (with confirmation alert)
  - App version info

## Navigation Architecture

**Root Navigation: Tab Bar (3 tabs)**
- Tab 1: **Chats** - Primary messaging interface with hierarchical group navigation
- Tab 2: **Emergency** - Dedicated emergency alert system (center position, distinct icon/color)
- Tab 3: **Settings** - User profile, preferences, and account management

**Information Architecture:**
- Chats Tab: Main Groups → Subgroups → Chat Room
- Emergency Tab: Main Groups → Subgroups → Emergency Messages
- Settings Tab: Single screen with sections (Profile, Notifications, Location, Account)

## Screen Specifications

### Login Screen
- **Purpose:** Authenticate user into the system
- **Layout:**
  - NO header (full-screen login)
  - Top section: App branding (logo/name)
  - Middle section: Credential form
  - Bottom section: Login button
- **Safe Area:** Top inset: insets.top + Spacing.xl, Bottom inset: insets.bottom + Spacing.xl
- **Components:** Text inputs, primary button, error alert banner

### Chats Tab - Group List
- **Purpose:** Display hierarchical group structure
- **Layout:**
  - Header: "Chats" title, transparent background
  - Main content: Scrollable list of main groups (expandable to show subgroups)
  - No floating elements
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components:** Expandable list items, unread badge indicators, group icons

### Chat Room Screen
- **Purpose:** Send/receive messages and files in a specific subgroup
- **Layout:**
  - Header: Subgroup name, back button (left), info button (right), non-transparent
  - Main content: Inverted FlatList (messages from bottom to top)
  - Fixed bottom: Message input bar with attach button, text input, send button
- **Safe Area:** Bottom: insets.bottom + Spacing.md (input bar handles its own padding)
- **Components:** Message bubbles, file attachments, timestamp labels, typing indicator

### Emergency Tab - Alert List
- **Purpose:** View and acknowledge emergency broadcasts
- **Layout:**
  - Header: "EMERGENCY" title (red accent), transparent background
  - Main content: Scrollable list of emergency messages (mirrors group hierarchy)
  - Floating element: Emergency broadcast button (admin only, bottom-right)
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl + 60px (for floating button)
- **Components:** Emergency alert cards (red border, bold text), acknowledgment button

### Emergency Full-Screen Modal
- **Purpose:** Force user attention to critical emergency alert
- **Layout:**
  - Full-screen overlay (covers entire app including tab bar)
  - Centered content: Alert icon, emergency message, timestamp
  - Bottom section: Large "Acknowledge" button
- **Behavior:** Modal cannot be dismissed without acknowledgment, triggers haptic feedback and custom sound
- **Components:** Large alert icon, scrollable message text, primary action button

### Settings Screen
- **Purpose:** Manage profile, preferences, and account
- **Layout:**
  - Header: "Settings" title, transparent background
  - Main content: Scrollable form sections (Profile, Notifications, Location, Account)
  - Form submit/cancel buttons: Not applicable (auto-save per section)
- **Safe Area:** Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Components:** Avatar picker, text inputs, toggle switches, section headers, destructive button (log out)

### Group Map Screen (Location Sharing)
- **Purpose:** View real-time locations of group members on a map
- **Layout:**
  - Header: Group name, back button (left), refresh button (right), non-transparent
  - Main content: react-native-maps MapView (full screen below header)
  - Floating element: Current location button (bottom-right)
- **Safe Area:** Top: 0 (map extends under header), Bottom: insets.bottom + Spacing.md
- **Components:** Map markers (member pins), user location indicator, location permission prompt

## Design System

### Color Palette
**Foundation Colors:**
- Primary: `#1E40AF` (Blue 800 - Trust, security, communication)
- Primary Light: `#3B82F6` (Blue 500)
- Primary Dark: `#1E3A8A` (Blue 900)
- Emergency: `#DC2626` (Red 600 - High alert, urgency)
- Emergency Light: `#FEE2E2` (Red 50 - Emergency background)
- Success: `#16A34A` (Green 600 - Acknowledgment, sent messages)
- Warning: `#F59E0B` (Amber 500 - Caution, location tracking)

**Neutral Colors:**
- Background: `#FFFFFF` (White - Clean, professional)
- Background Secondary: `#F9FAFB` (Gray 50)
- Surface: `#F3F4F6` (Gray 100 - Cards, input fields)
- Border: `#E5E7EB` (Gray 200)
- Text Primary: `#111827` (Gray 900)
- Text Secondary: `#6B7280` (Gray 500)
- Text Disabled: `#9CA3AF` (Gray 400)

**Message Bubbles:**
- Sent (User): `#3B82F6` with white text
- Received (Others): `#F3F4F6` with gray-900 text
- Emergency: `#DC2626` with white text

### Typography
- **Font Family:** System default (San Francisco on iOS, Roboto on Android)
- **Heading Large:** 28px, Bold, Gray 900
- **Heading Medium:** 20px, Semi-bold, Gray 900
- **Body Large:** 17px, Regular, Gray 900
- **Body:** 15px, Regular, Gray 700
- **Caption:** 13px, Regular, Gray 500
- **Button:** 16px, Semi-bold, Uppercase on Android only
- **Emergency Text:** 17px, Bold, Red 600

### Visual Feedback
- **Touchable Components:** Use opacity: 0.7 on press (activeOpacity={0.7})
- **Buttons:** Scale animation (scale: 0.98) on press
- **List Items:** Gray 100 background on press
- **Emergency Button:** Haptic feedback + red pulse animation on press
- **Send Button:** Disabled state (gray 300 background) when input is empty

### Drop Shadows (Floating Elements Only)
**Emergency Broadcast Button:**
- shadowOffset: { width: 0, height: 2 }
- shadowOpacity: 0.10
- shadowRadius: 2
- shadowColor: `#DC2626`

**Call Button (if floating):**
- shadowOffset: { width: 0, height: 2 }
- shadowOpacity: 0.10
- shadowRadius: 2
- shadowColor: `#000000`

### Icons
- **System Icons:** Use Feather icons from @expo/vector-icons
- **Standard Icons:** message-circle (chat), alert-triangle (emergency), settings (gear), map-pin (location), paperclip (attach), send (send message)
- **Icon Sizes:** 24px (default), 20px (tab bar), 48px (emergency modal)
- **Emergency Icon:** alert-octagon (red, large, pulsing animation)

### Critical Assets

**Generated Assets Required:**
1. **User Avatars (4 presets):** Professional, minimalist avatar designs in circular format with solid color backgrounds matching the primary palette. Style: Geometric, abstract representations (not emoji-based).
2. **Emergency Alert Sound:** High-priority audio file (emergency.wav) - loud, urgent, distinct tone
3. **App Icon:** Badge-style icon combining chat bubble and emergency alert symbol, primary blue with red accent

**Standard Icons (Feather):**
- No custom generation needed - use @expo/vector-icons throughout

## Interaction Design

### Emergency Alert Behavior
1. **App Open:** Trigger full-screen modal immediately via Socket.io event + haptic vibration (expo-haptics Heavy Impact pattern x3)
2. **App Closed:** High-priority Expo Push Notification with custom sound
3. **Persistence:** Check for unacknowledged alerts on every app launch
4. **Acknowledgment:** Requires explicit button press (modal cannot be dismissed by back gesture)

### Location Sharing
- **Permission Prompt:** Request on first access to Group Map or when admin enables tracking
- **Background Indicator:** iOS blue bar or Android persistent notification when tracking is active
- **User Control:** Toggle in Settings (if admin has enabled for user)
- **Privacy:** Clear visual indication (icon in header) when location is being shared

### File Sharing
- **Trigger:** Paperclip icon button in message input bar
- **Action Sheet:** Camera, Photo Library, Documents
- **Upload State:** Progress indicator in message bubble
- **Preview:** Tap to open in full screen with expo-sharing options

## Accessibility Requirements

- **Color Contrast:** Maintain WCAG AA standard (4.5:1 for text)
- **Touch Targets:** Minimum 44x44pt for all interactive elements
- **Screen Readers:** Proper accessibility labels for all icons and buttons
- **Emergency Alerts:** High contrast (red on white), large text, haptic + audio feedback
- **Focus Indicators:** Visible focus states for keyboard navigation (if supported)
- **Text Scaling:** Support Dynamic Type/Font Scaling up to 200%
- **Motion:** Respect reduce-motion preferences (disable pulse animations)