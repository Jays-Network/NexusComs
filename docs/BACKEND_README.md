# World Risk - Backend Authentication Service

Express.js backend server that securely generates Stream authentication tokens for the World Risk mobile application. Includes a professional web UI for testing.

## Features

- **Secure Token Generation**: Stream JWT tokens created server-side
- **User Management**: Automatic user upsert in Stream
- **Web UI**: Professional interface for testing authentication at http://localhost:3000
- **Health Monitoring**: Health check endpoint for monitoring
- **CORS Enabled**: Ready for cross-origin requests
- **Production Ready**: Proper error handling and validation

## Tech Stack

- **Framework**: Express.js
- **Stream**: Stream Chat Server-Side SDK
- **Environment**: Node.js 18+
- **Security**: dotenv for secrets management

## Prerequisites

- Node.js 18+
- Stream account with API credentials
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/world-risk.git
   cd world-risk
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. Set up environment variables:
   Create a `.env` file in the `backend` directory:
   ```env
   STREAM_API_KEY=your_stream_api_key
   STREAM_API_SECRET=your_stream_api_secret
   PORT=3000
   ```

4. Start the server (from repository root):
   ```bash
   ./start-backend.sh
   ```

## Running the Server

### Standalone Backend

```bash
./start-backend.sh
```

Server will start on port 3000 (or PORT env variable).

### With Frontend (Concurrent)

```bash
./start-dev.sh
```

This runs both backend (port 3000) and frontend (port 8081) together.

## Web UI

Access the web interface at **http://localhost:3000** when the server is running.

### Features:
- Generate Stream tokens via web form
- Real-time server status indicator
- Input validation for user data
- Formatted JSON responses
- API documentation

### Using the Web UI:
1. Enter a User ID (letters, numbers, hyphens, underscores)
2. Enter a User Name
3. Optionally add a Profile Image URL
4. Click "Generate Stream Token"
5. View the generated token, user ID, and API key

## API Endpoints

### GET /
Serves the web UI HTML page.

**Response:** HTML page

---

### POST /api/auth/stream-token
Generates a Stream authentication token for a user.

**Request Body:**
```json
{
  "userId": "john_doe",
  "userName": "John Doe",
  "userImage": "https://example.com/avatar.jpg"  // optional
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "john_doe",
  "apiKey": "your_stream_api_key"
}
```

**Error Response (400):**
```json
{
  "error": "userId and userName are required"
}
```

**Error Response (500):**
```json
{
  "error": "Failed to generate token"
}
```

---

### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok"
}
```

## Environment Variables

Required:
- `STREAM_API_KEY` - Your Stream API key
- `STREAM_API_SECRET` - Your Stream API secret (NEVER expose to client)

Optional:
- `PORT` - Server port (default: 3000)

## Security Features

1. **API Secret Protection**: Stream API Secret never exposed to clients
2. **User ID Sanitization**: Cleans user IDs before token generation
3. **Input Validation**: Validates required fields before processing
4. **Error Handling**: Graceful error responses without exposing internals
5. **CORS**: Configured for secure cross-origin requests

## Project Structure

```
backend/
├── src/
│   └── server.js          # Main Express server
├── public/
│   └── index.html         # Web UI
├── package.json           # Dependencies
└── .env                   # Environment variables (create this)

Scripts:
├── start-backend.sh       # Start backend only
└── start-dev.sh          # Start backend + frontend
```

## Testing the API

### Using curl:

```bash
# Health check
curl http://localhost:3000/health

# Generate token
curl -X POST http://localhost:3000/api/auth/stream-token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "userName": "Test User"
  }'
```

### Using the Web UI:

1. Start the server: `./start-backend.sh`
2. Open browser to http://localhost:3000
3. Fill in the form and click "Generate Stream Token"
4. View the response with token details

## Deployment

### Environment Setup

Ensure these environment variables are set in production:
- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `PORT` (optional)

### Production Considerations

1. Use a process manager (PM2, systemd)
2. Set up HTTPS with reverse proxy (nginx, Apache)
3. Configure rate limiting
4. Add request logging
5. Set up monitoring and alerts
6. Use environment-specific .env files

### Example PM2 Configuration:

```bash
pm2 start backend/src/server.js --name world-risk-backend
pm2 save
pm2 startup
```

## Troubleshooting

### Server won't start
- Check that port 3000 is available
- Verify all dependencies are installed: `npm install`
- Ensure environment variables are set correctly

### Token generation fails
- Verify Stream API credentials are correct
- Check server logs for detailed error messages
- Ensure user ID contains only valid characters

### Cannot access Web UI
- Ensure server is running: `curl http://localhost:3000/health`
- Check browser console for errors
- Verify firewall allows connections on port 3000

### CORS errors
- CORS is enabled by default
- Check that frontend URL is allowed in CORS config
- Verify request headers are correct

## Integration with Frontend

The frontend app calls this backend at:
```
POST {EXPO_PUBLIC_API_URL}/api/auth/stream-token
```

Frontend environment variable:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

In production, update to your deployed backend URL.

## Stream Setup

1. Create account at https://getstream.io
2. Create a new app
3. Get API key and secret from dashboard
4. Add to backend .env file
5. Configure app settings in Stream dashboard

## Support

For issues related to:
- Stream SDK: https://getstream.io/chat/docs/node/
- Express: https://expressjs.com/
- Node.js: https://nodejs.org/

## License

Proprietary - World Risk Application
