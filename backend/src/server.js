const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { StreamChat } = require('stream-chat');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const serverClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

app.post('/api/auth/stream-token', async (req, res) => {
  try {
    const { userId, userName, userImage } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }

    const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    await serverClient.upsertUser({
      id: sanitizedUserId,
      name: userName,
      image: userImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
    });

    const token = serverClient.createToken(sanitizedUserId);

    res.json({
      token,
      userId: sanitizedUserId,
      apiKey: process.env.STREAM_API_KEY,
    });
  } catch (error) {
    console.error('Error generating Stream token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Web UI available at http://localhost:${PORT}`);
  console.log(`Stream API Key: ${process.env.STREAM_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`Stream API Secret: ${process.env.STREAM_API_SECRET ? 'Configured' : 'Missing'}`);
});
