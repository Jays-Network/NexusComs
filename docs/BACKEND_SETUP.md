# Backend Authentication Setup

## Overview
WorldRisk Nexus Coms now uses a proper backend server to generate Stream tokens securely. This ensures the Stream API Secret is never exposed to the client.

## Web UI
The backend includes a user-friendly web interface for testing and generating tokens:
- **Access**: Open http://localhost:3000 in your browser (when backend is running)
- **Features**:
  - Generate Stream tokens via web form
  - Real-time server status indicator
  - API endpoint documentation
  - Formatted JSON responses
  
## Architecture
- **Frontend**: Expo app running on port 8081 (default Expo port)
- **Backend**: Express server running on port 3000 with web UI
- **Authentication Flow**: 
  1. User enters credentials in the app (or web UI)
  2. App calls `/api/auth/stream-token` endpoint
  3. Backend securely generates Stream token using API Secret
  4. App receives token and connects to Stream services

## Running the Application

### Option 1: Manual (Recommended for Testing)
1. Open a new Shell tab in Replit
2. Run: `./start-backend.sh`
3. Keep this shell open (backend server will run here)
4. Access the web UI at http://localhost:3000
5. The main workflow runs the frontend automatically

### Option 2: Using Concurrently (Automated)
The `start-dev.sh` script runs both servers together:
```bash
./start-dev.sh
```

This will start:
- Backend on port 3000 (with web UI at http://localhost:3000)
- Frontend on port 8081 (Expo app)

## Environment Variables
The following secrets are required (already configured):
- `STREAM_API_KEY`: Your Stream API key (also exposed as EXPO_PUBLIC_STREAM_API_KEY for client)
- `STREAM_API_SECRET`: Your Stream API secret (NEVER exposed to client)

## API Endpoints

### GET /
Serves the web UI for testing the authentication service.

**Response:** HTML page with interactive form

### POST /api/auth/stream-token
Generates a Stream authentication token for a user.

**Request:**
```json
{
  "userId": "john_doe",
  "userName": "John Doe",
  "userImage": "https://..." // optional
}
```

**Response:**
```json
{
  "token": "eyJhbGci...",
  "userId": "john_doe",
  "apiKey": "your-api-key"
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Security Notes
1. ✅ Stream API Secret is ONLY used on the backend server
2. ✅ Tokens are generated server-side and sent to clients
3. ✅ User IDs are sanitized before creating tokens
4. ❌ Development tokens are NO LONGER used (more secure)

## Troubleshooting

### Backend won't start
- Ensure port 3000 is available
- Check that all dependencies are installed
- Verify environment variables are set

### Authentication fails
- Ensure backend server is running
- Check browser console for API errors
- Verify Stream API credentials are correct

### Cannot connect to backend from app
- Make sure backend is running on port 3000
- Check the API_URL in `utils/streamApi.ts`
- For Replit: backend should be accessible on the same domain

## Files
- `backend/src/server.js`: Express server with auth endpoints
- `backend/public/index.html`: Web UI for testing authentication
- `utils/streamApi.ts`: Client-side API calls to backend
- `utils/streamAuth.tsx`: Updated to use backend tokens
- `start-backend.sh`: Script to start backend server
- `start-dev.sh`: Script to run both frontend and backend

## Next Steps for Production
1. Build the app with EAS (Expo Application Services)
2. Deploy the backend to a production server
3. Update `EXPO_PUBLIC_API_URL` to point to production backend
4. Ensure all environment variables are properly set in production
