# Enterprise Communication App - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required** - Enterprise communication mandates user accounts for messaging.

**Implementation:**
- Use SSO (Apple Sign-In for iOS, Google Sign-In for Android)
- Include enterprise email/password option for corporate environments
- Login screen with:
  - Company logo placeholder (50x50px)
  - SSO buttons with gold accent on press
  - Privacy policy & terms links
- Account screen features:
  - Professional avatar selection (4 preset options: abstract geometric patterns in gold/black/white)
  - Display name (required)
  - Status message (optional, 60 char max)
  - Log out button
  - Settings > Account > Delete account (double confirmation)

### Navigation
**Tab Navigation** - 4 tabs total with floating action button for core "New Message" action.

**Tab Bar Specifications:**
- Background: White
- Active tab: Gold (#D4AF37)
- Inactive tab: Black with 40% opacity
- Height: 60px + safe area bottom inset
- Tabs (left to right):
  1. **Chats** (home icon) - Main chat list
  2. **Contacts** (users icon) - Company directory
  3. **Calls** (phone icon) - Call history
  4. **Profile** (user icon) - Account & settings

**Floating Action Button:**
- Position: Bottom right, 80px from bottom (above tab bar), 20px from right
- Size: 56x56px circular
- Background: Gold (#D4AF37)
- Icon: Message-square (Feather), white, 24px
- Shadow: offset (0, 2), opacity 0.10, radius 2

## Screen Specifications

### 1. Chats Screen (Main)
**Purpose:** Browse and search all conversations

**Layout:**
- Header: Custom transparent header
  - Title: "Messages" (28px, bold, black)
  - Right button: Search icon (toggles search bar)
  - Top inset: headerHeight + 24px
- Search bar (when active):
  - Background: White with 1px gold border
  - Placeholder: "Search messages..."
  - Height: 44px, rounded 12px
- Main content: FlatList (scrollable)
  - Bottom inset: tabBarHeight + 24px
  
**Components:**
- Chat list item (each):
  - Height: 80px
  - Avatar: 48x48px circle (left, gold border 2px if unread)
  - Name: 16px semibold, black
  - Last message: 14px regular, gray (#666666), 1 line truncated
  - Timestamp: 12px, top right, gray
  - Unread badge: Gold circle with white count
  - Press feedback: Background changes to #F5F5F5
- Date separators: "Today", "Yesterday", dates
  - 12px, gray, centered, 40px height
- Empty state: "No conversations yet" centered

### 2. Chat Conversation Screen
**Purpose:** Send and receive messages with a contact

**Layout:**
- Header: Default navigation header (white background)
  - Left: Back button (black)
  - Center: Contact name + status ("Online", "Last seen...")
  - Right: Video call icon
- Main content: Inverted FlatList (scrollable from bottom)
  - Top inset: 24px
  - Bottom inset: 80px (input area height)
  
**Components:**
- Message bubbles:
  - Sent (right-aligned):
    - Background: Gold (#D4AF37)
    - Text: White, 15px
    - Max width: 75% screen width
    - Border radius: 18px (12px bottom right)
    - Padding: 12px horizontal, 8px vertical
  - Received (left-aligned):
    - Background: White with 1px #E0E0E0 border
    - Text: Black, 15px
    - Same dimensions as sent
    - Border radius: 18px (12px bottom left)
  - Timestamp: 11px, gray, below bubble
  - Press feedback: Slight scale (0.98)
- Date separators: Same as Chats screen
- Message input (fixed bottom):
  - Background: White
  - Height: 60px + safe area bottom
  - Input field: 44px height, white background, 1px gold border, rounded 22px
  - Attachment icon (left): Paperclip, black
  - Send button (right): Circular 40px, gold background, white arrow icon
  - Both buttons have press feedback (gold -> darker gold #B8962F)

### 3. Contacts Screen
**Purpose:** Browse company directory

**Layout:**
- Header: Custom transparent header
  - Title: "Contacts" (28px, bold)
  - Right: Add contact icon
  - Top inset: headerHeight + 24px
- Alphabetical section list
  - Bottom inset: tabBarHeight + 24px

**Components:**
- Section headers: Single letter (A, B, C...), gold, 14px semibold, 32px height
- Contact items: 64px height, similar to chat items but no message preview
- Press feedback: #F5F5F5 background

### 4. Profile Screen
**Purpose:** Manage account and settings

**Layout:**
- Header: Custom transparent header
  - Title: "Profile" (28px, bold)
  - Top inset: headerHeight + 24px
- Main content: ScrollView
  - Bottom inset: tabBarHeight + 24px

**Components:**
- Profile card (top):
  - Avatar: 100x100px, centered
  - Name: 20px semibold
  - Status: 14px gray
  - Edit button: Gold outline, 40px height
- Settings sections:
  - "Account", "Notifications", "Privacy", "Help"
  - Each item: 56px height, right chevron
  - Separators: 1px #E0E0E0

### 5. New Message Modal (from FAB)
**Purpose:** Start new conversation

**Layout:**
- Native modal (slides up from bottom)
- Header: White background
  - Left: Cancel (black text)
  - Center: "New Message" (17px semibold)
  - Right: None
- Content: Contact search and list
- Safe area insets: Standard modal insets

## Design System

### Color Palette
- **Primary Gold:** #D4AF37
- **Primary Gold Pressed:** #B8962F
- **Black:** #000000
- **White:** #FFFFFF
- **Gray Text:** #666666
- **Light Gray:** #F5F5F5
- **Border Gray:** #E0E0E0

### Typography
- **Headers:** 28px, bold, black
- **Titles:** 20px, semibold, black
- **Body:** 15-16px, regular, black
- **Subtitles:** 14px, regular, gray
- **Captions:** 11-12px, regular, gray

### Interaction Design
- All touchables: Visual feedback required
- Buttons: Color change or scale (0.95)
- List items: Background color change (#F5F5F5)
- Message bubbles: Scale (0.98)
- Tab icons: Color change (gold/black)

### Accessibility
- Minimum touch target: 44x44px
- Text contrast ratios meet WCAG AA
- VoiceOver labels for all interactive elements
- Support dynamic type scaling

## Critical Assets

**Generate 4 preset avatars:**
- Abstract geometric patterns (circles, triangles, hexagons)
- Color schemes: Gold/black gradients, black/white patterns
- Professional, non-figurative designs
- 200x200px, exportable

**Icons:**
- Use Feather icon set from @expo/vector-icons
- No custom icon assets needed
- No emojis in UI

**Optional:**
- Company logo placeholder for login screen (50x50px square)