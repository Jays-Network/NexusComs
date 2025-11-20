# World Risk - GitHub Upload Guide

This guide explains how to upload your World Risk application to GitHub using the provided archive files.

## Archive Files

Two archive files have been created for you:

### 1. `world-risk-frontend.tar.gz` (2.0 MB)
Contains the complete Expo React Native mobile application.

**Includes:**
- React Native app code (screens, components, navigation)
- Assets (images, sounds, fonts)
- Expo configuration
- Stream Chat SDK integration
- Frontend utilities and helpers
- Design guidelines
- Complete README with setup instructions

**GitHub Repository Name Suggestion:** `world-risk-app` or `world-risk-mobile`

---

### 2. `world-risk-backend.tar.gz` (5.5 KB)
Contains the Express.js authentication backend server and web UI.

**Includes:**
- Express.js server with authentication endpoints
- Web UI for testing authentication
- Stream Chat server-side SDK
- Startup scripts
- Complete README with API documentation

**GitHub Repository Name Suggestion:** `world-risk-backend` or `world-risk-auth-server`

## Upload Options

### Option A: Two Separate Repositories (Recommended)

This approach keeps frontend and backend separate, which is ideal for:
- Different deployment workflows
- Independent version control
- Team collaboration with different access levels
- Easier CI/CD setup

**Steps:**

1. **Create Frontend Repository:**
   ```bash
   # Extract frontend archive
   tar -xzf world-risk-frontend.tar.gz
   cd world-risk-frontend
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial commit: World Risk mobile app"
   
   # Create repository on GitHub and push
   git remote add origin https://github.com/YOUR_USERNAME/world-risk-app.git
   git branch -M main
   git push -u origin main
   ```

2. **Create Backend Repository:**
   ```bash
   # Extract backend archive
   tar -xzf world-risk-backend.tar.gz
   cd world-risk-backend
   
   # Initialize git
   git init
   git add .
   git commit -m "Initial commit: World Risk authentication backend"
   
   # Create repository on GitHub and push
   git remote add origin https://github.com/YOUR_USERNAME/world-risk-backend.git
   git branch -M main
   git push -u origin main
   ```

---

### Option B: Monorepo (Single Repository)

This approach keeps everything in one repository, organized in subdirectories.

**Steps:**

```bash
# Create project directory
mkdir world-risk
cd world-risk

# Extract both archives
tar -xzf ../world-risk-frontend.tar.gz
tar -xzf ../world-risk-backend.tar.gz

# Rename README files to avoid conflicts
mv world-risk-frontend/FRONTEND_README.md world-risk-frontend/README.md
mv world-risk-backend/BACKEND_README.md world-risk-backend/README.md

# Create main README
cat > README.md << 'EOF'
# World Risk

Production-ready mobile chat application with real-time messaging, emergency alerts, and secure authentication.

## Project Structure

- `/world-risk-frontend` - Expo React Native mobile app
- `/world-risk-backend` - Express.js authentication backend with web UI

## Quick Start

See individual README files in each directory for detailed setup instructions.

### Backend
```bash
cd world-risk-backend
npm install
./start-backend.sh
```

### Frontend
```bash
cd world-risk-frontend
npm install
npm run dev
```

## Features

- Hierarchical group messaging with Stream Chat
- Real-time chat with emergency alert system
- Secure backend authentication (no client-side secrets)
- Professional web UI for testing
- iOS 26 Liquid Glass interface design

## Documentation

- Frontend: See `world-risk-frontend/README.md`
- Backend: See `world-risk-backend/README.md`
- Backend Setup: See `world-risk-backend/BACKEND_SETUP.md`
EOF

# Initialize git
git init
git add .
git commit -m "Initial commit: World Risk application"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/world-risk.git
git branch -M main
git push -u origin main
```

## Important Files to Review Before Upload

### Security
Before uploading, ensure these files are NOT included:
- `.env` files (should be in .gitignore)
- `node_modules/` directories
- Any files containing API secrets or keys

### Create .gitignore
Both archives should include proper .gitignore files, but verify they contain:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment
.env
.env.local
.env.production

# Expo
.expo/
.expo-shared/

# Misc
.DS_Store
*.log
npm-debug.log*
```

## Post-Upload Steps

### 1. Update Repository Settings
- Add description: "Production-ready mobile chat app with emergency alerts"
- Add topics: `expo`, `react-native`, `stream-chat`, `emergency-alerts`
- Set visibility (public/private)

### 2. Create GitHub Secrets (for CI/CD)
In repository settings → Secrets and variables → Actions:
- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `EXPO_TOKEN` (if using EAS)

### 3. Add License
Choose an appropriate license (MIT, Apache 2.0, or Proprietary)

### 4. Enable GitHub Actions (Optional)
Set up CI/CD workflows for:
- Automated testing
- EAS builds
- Backend deployment

### 5. Create Issues/Projects
Set up GitHub Issues for:
- Bug tracking
- Feature requests
- Enhancement ideas

## Environment Variables Documentation

### Frontend (.env)
```env
EXPO_PUBLIC_STREAM_API_KEY=your_stream_api_key
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Backend (.env)
```env
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
PORT=3000
```

**⚠️ NEVER commit these files to GitHub!**

## Connecting Frontend to Backend

After deployment, update frontend environment:

**Development:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Production:**
```env
EXPO_PUBLIC_API_URL=https://your-backend-domain.com
```

## Additional Resources

### Frontend Repository Setup
- Clone and setup: See `FRONTEND_README.md`
- Running on device: Scan QR code with Expo Go
- Building for production: `eas build`

### Backend Repository Setup
- Clone and setup: See `BACKEND_README.md`
- Web UI: http://localhost:3000
- API Documentation: See `BACKEND_SETUP.md`

## Deployment Recommendations

### Frontend
- **Expo Application Services (EAS)**
  - Build: `eas build --platform all`
  - Submit to stores: `eas submit`
  - Over-the-air updates: `eas update`

### Backend
- **Recommended Platforms:**
  - Railway
  - Render
  - Heroku
  - AWS EC2/ECS
  - DigitalOcean App Platform

## Support and Maintenance

### Repository Maintenance
- Keep dependencies updated: `npm update`
- Review security alerts regularly
- Test before merging PRs
- Use semantic versioning for releases

### Documentation
- Keep READMEs up to date
- Document API changes
- Maintain changelog
- Add inline code comments for complex logic

## Questions?

Refer to the detailed README files in each archive for:
- Installation instructions
- API documentation
- Troubleshooting guides
- Configuration options

---

**Created:** November 20, 2025  
**Version:** 1.0  
**App:** World Risk - Emergency Communication Platform
