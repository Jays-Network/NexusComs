require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Expo } = require('expo-server-sdk');
const { supabase, initializeDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const expo = new Expo();
const JWT_SECRET = process.env.SESSION_SECRET;
const PORT = process.env.PORT || 3000;

// Validate required environment variables
if (!JWT_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is not set');
  console.error('Please set SESSION_SECRET in your environment variables');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, pushToken } = req.body;

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update push token if provided
    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      await supabase
        .from('users')
        .update({ push_token: pushToken })
        .eq('id', user.id);
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        isAdmin: user.is_admin,
        locationTrackingEnabled: user.location_tracking_enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, is_admin, location_tracking_enabled')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isAdmin: user.is_admin,
      locationTrackingEnabled: user.location_tracking_enabled
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GROUP ROUTES ====================

// Get all groups for user
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    // Get all main groups
    const { data: mainGroups, error: mainError } = await supabase
      .from('main_groups')
      .select('*')
      .order('name');

    if (mainError) throw mainError;

    // Get all subgroups with member info
    const { data: subgroups, error: subError } = await supabase
      .from('subgroups')
      .select(`
        *,
        group_members!inner(user_id)
      `)
      .eq('group_members.user_id', req.user.id);

    if (subError) throw subError;

    // Organize data
    const groupsWithSubgroups = mainGroups.map(group => ({
      ...group,
      subgroups: subgroups.filter(sub => sub.main_group_id === group.id)
    }));

    res.json(groupsWithSubgroups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get subgroup details
app.get('/api/subgroups/:id', authenticateToken, async (req, res) => {
  try {
    const { data: subgroup, error } = await supabase
      .from('subgroups')
      .select(`
        *,
        main_groups(name),
        group_members(
          user_id,
          users(id, username, display_name, avatar_url)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    res.json(subgroup);
  } catch (error) {
    console.error('Get subgroup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== MESSAGE ROUTES ====================

// Get messages for subgroup
app.get('/api/messages/:subgroupId', authenticateToken, async (req, res) => {
  try {
    const { subgroupId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        users(id, username, display_name, avatar_url)
      `)
      .eq('subgroup_id', subgroupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform snake_case to camelCase for client
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      subgroupId: msg.subgroup_id,
      encryptedContent: msg.encrypted_content,
      messageType: msg.message_type,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      createdAt: msg.created_at,
      user: msg.users ? {
        id: msg.users.id,
        username: msg.users.username,
        displayName: msg.users.display_name,
        avatarUrl: msg.users.avatar_url
      } : null
    })).reverse();

    res.json(transformedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// File upload
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.json({
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ==================== EMERGENCY ROUTES ====================

// Get all emergency messages for user's subgroups
app.get('/api/emergency/all', authenticateToken, async (req, res) => {
  try {
    // Get all subgroups the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select('subgroup_id')
      .eq('user_id', req.user.id);

    if (memberError) throw memberError;

    const subgroupIds = memberships.map(m => m.subgroup_id);

    // Get all emergency messages from those subgroups
    const { data: messages, error } = await supabase
      .from('emergency_messages')
      .select(`
        *,
        users!emergency_messages_sender_id_fkey(id, username, display_name, avatar_url),
        emergency_acknowledgments(user_id, acknowledged_at)
      `)
      .in('subgroup_id', subgroupIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform snake_case to camelCase for client
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      subgroupId: msg.subgroup_id,
      senderId: msg.sender_id,
      encryptedContent: msg.encrypted_content,
      createdAt: msg.created_at,
      users: {
        id: msg.users.id,
        username: msg.users.username,
        displayName: msg.users.display_name,
        avatarUrl: msg.users.avatar_url
      },
      emergency_acknowledgments: (msg.emergency_acknowledgments || []).map(ack => ({
        userId: ack.user_id,
        acknowledgedAt: ack.acknowledged_at
      }))
    }));

    res.json(transformedMessages);
  } catch (error) {
    console.error('Get all emergency messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get emergency messages for a specific subgroup
app.get('/api/emergency/:subgroupId', authenticateToken, async (req, res) => {
  try {
    const { data: messages, error } = await supabase
      .from('emergency_messages')
      .select(`
        *,
        users(id, username, display_name, avatar_url),
        emergency_acknowledgments(user_id, acknowledged_at)
      `)
      .eq('subgroup_id', req.params.subgroupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    console.error('Get emergency messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Acknowledge emergency
app.post('/api/emergency/:messageId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('emergency_acknowledgments')
      .insert({
        emergency_message_id: req.params.messageId,
        user_id: req.user.id
      });

    if (error && error.code !== '23505') throw error; // Ignore duplicate key errors

    res.json({ success: true });
  } catch (error) {
    console.error('Acknowledge emergency error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Broadcast emergency (admin only)
app.post('/api/emergency/broadcast', authenticateToken, async (req, res) => {
  try {
    const { subgroupId, encryptedContent } = req.body;

    // Verify admin
    const { data: user } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (!user?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Insert emergency message
    const { data: message, error } = await supabase
      .from('emergency_messages')
      .insert({
        subgroup_id: subgroupId,
        sender_id: req.user.id,
        encrypted_content: encryptedContent
      })
      .select()
      .single();

    if (error) throw error;

    // Get all group members
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, users(push_token, display_name)')
      .eq('subgroup_id', subgroupId)
      .neq('user_id', req.user.id);

    // Send push notifications
    const pushTokens = members
      .filter(m => m.users?.push_token && Expo.isExpoPushToken(m.users.push_token))
      .map(m => m.users.push_token);

    if (pushTokens.length > 0) {
      const messages = pushTokens.map(token => ({
        to: token,
        sound: 'emergency.wav',
        title: 'EMERGENCY ALERT',
        body: 'Emergency message received',
        data: { type: 'emergency', messageId: message.id, subgroupId },
        priority: 'high',
        channelId: 'emergency-alerts'
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('Push notification error:', error);
        }
      }
    }

    // Emit via Socket.io
    io.to(subgroupId).emit('emergency_alert', {
      id: message.id,
      subgroupId,
      senderId: req.user.id,
      encryptedContent,
      createdAt: message.created_at
    });

    res.json(message);
  } catch (error) {
    console.error('Emergency broadcast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== LOCATION ROUTES ====================

// Update location
app.post('/api/location/update', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    // Check if tracking is enabled
    const { data: user } = await supabase
      .from('users')
      .select('location_tracking_enabled')
      .eq('id', req.user.id)
      .single();

    if (!user?.location_tracking_enabled) {
      return res.status(403).json({ error: 'Location tracking not enabled' });
    }

    const { error } = await supabase
      .from('user_locations')
      .insert({
        user_id: req.user.id,
        latitude,
        longitude,
        accuracy
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get group locations
app.get('/api/location/group/:subgroupId', authenticateToken, async (req, res) => {
  try {
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('subgroup_id', req.params.subgroupId);

    if (!members) {
      return res.json([]);
    }

    const userIds = members.map(m => m.user_id);

    // Get latest location for each user
    const { data: locations, error } = await supabase
      .from('user_locations')
      .select(`
        *,
        users(id, display_name, avatar_url)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get only the most recent location per user
    const latestLocations = {};
    locations.forEach(loc => {
      if (!latestLocations[loc.user_id]) {
        latestLocations[loc.user_id] = loc;
      }
    });

    res.json(Object.values(latestLocations));
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== ADMIN ROUTES ====================

// Create user (admin only)
app.post('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const { data: admin } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (!admin?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username, password, displayName, isAdmin } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        display_name: displayName,
        is_admin: isAdmin || false
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.display_name,
      isAdmin: newUser.is_admin
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const { data: admin } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (!admin?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, display_name, is_admin, location_tracking_enabled, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle user location tracking (admin only)
app.patch('/api/admin/users/:userId/location', authenticateToken, async (req, res) => {
  try {
    const { data: admin } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();

    if (!admin?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { enabled } = req.body;

    const { error } = await supabase
      .from('users')
      .update({ location_tracking_enabled: enabled })
      .eq('id', req.params.userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle location error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== SOCKET.IO ====================

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.userId = userId;
  });

  socket.on('join_room', (subgroupId) => {
    socket.join(subgroupId);
    console.log(`User ${socket.userId} joined room ${subgroupId}`);
  });

  socket.on('leave_room', (subgroupId) => {
    socket.leave(subgroupId);
    console.log(`User ${socket.userId} left room ${subgroupId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { subgroupId, encryptedContent, messageType, fileUrl, fileName, fileSize } = data;

      // Save to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          subgroup_id: subgroupId,
          user_id: socket.userId,
          encrypted_content: encryptedContent,
          message_type: messageType || 'text',
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize
        })
        .select(`
          *,
          users(id, username, display_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Broadcast to room
      io.to(subgroupId).emit('new_message', message);

      // Send push notifications to other members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, users(push_token, display_name)')
        .eq('subgroup_id', subgroupId)
        .neq('user_id', socket.userId);

      if (members) {
        const pushTokens = members
          .filter(m => m.users?.push_token && Expo.isExpoPushToken(m.users.push_token))
          .map(m => m.users.push_token);

        if (pushTokens.length > 0) {
          const { data: sender } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', socket.userId)
            .single();

          const notifications = pushTokens.map(token => ({
            to: token,
            sound: 'default',
            title: 'New Message',
            body: `${sender?.display_name || 'Someone'} sent a message`,
            data: { type: 'message', subgroupId },
            priority: 'normal'
          }));

          const chunks = expo.chunkPushNotifications(notifications);
          for (const chunk of chunks) {
            try {
              await expo.sendPushNotificationsAsync(chunk);
            } catch (error) {
              console.error('Push notification error:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== ADMIN WEB DASHBOARD ====================

app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SecureChat Admin Dashboard</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100">
      <div class="min-h-screen">
        <nav class="bg-blue-900 text-white p-4">
          <h1 class="text-2xl font-bold">SecureChat Admin Dashboard</h1>
        </nav>
        
        <div class="container mx-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-xl font-bold mb-4">Create New User</h2>
              <form id="createUserForm" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Username</label>
                  <input type="text" name="username" required class="w-full border rounded px-3 py-2">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Password</label>
                  <input type="password" name="password" required class="w-full border rounded px-3 py-2">
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Display Name</label>
                  <input type="text" name="displayName" required class="w-full border rounded px-3 py-2">
                </div>
                <div class="flex items-center">
                  <input type="checkbox" name="isAdmin" class="mr-2">
                  <label class="text-sm font-medium">Admin User</label>
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Create User
                </button>
              </form>
              <div id="createUserResult" class="mt-4"></div>
            </div>

            <div class="bg-white rounded-lg shadow p-6">
              <h2 class="text-xl font-bold mb-4">Emergency Broadcast</h2>
              <form id="emergencyForm" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">Message</label>
                  <textarea name="message" required rows="4" class="w-full border rounded px-3 py-2"></textarea>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">Subgroup ID</label>
                  <input type="text" name="subgroupId" required class="w-full border rounded px-3 py-2">
                </div>
                <button type="submit" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Send Emergency Alert
                </button>
              </form>
              <div id="emergencyResult" class="mt-4"></div>
            </div>
          </div>

          <div class="mt-6 bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">Users</h2>
            <div id="usersList"></div>
          </div>
        </div>
      </div>

      <script>
        let authToken = localStorage.getItem('adminToken');

        if (!authToken) {
          const token = prompt('Enter admin authentication token:');
          if (token) {
            authToken = token;
            localStorage.setItem('adminToken', token);
          }
        }

        // Create user form
        document.getElementById('createUserForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = {
            username: formData.get('username'),
            password: formData.get('password'),
            displayName: formData.get('displayName'),
            isAdmin: formData.get('isAdmin') === 'on'
          };

          try {
            const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
              },
              body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
              document.getElementById('createUserResult').innerHTML = 
                '<div class="text-green-600">User created successfully!</div>';
              e.target.reset();
              loadUsers();
            } else {
              document.getElementById('createUserResult').innerHTML = 
                '<div class="text-red-600">Error: ' + result.error + '</div>';
            }
          } catch (error) {
            document.getElementById('createUserResult').innerHTML = 
              '<div class="text-red-600">Error: ' + error.message + '</div>';
          }
        });

        // Load users
        async function loadUsers() {
          try {
            const res = await fetch('/api/admin/users', {
              headers: {
                'Authorization': 'Bearer ' + authToken
              }
            });

            const users = await res.json();
            const html = users.map(user => \`
              <div class="border-b py-2 flex justify-between items-center">
                <div>
                  <strong>\${user.display_name}</strong> (@\${user.username})
                  \${user.is_admin ? '<span class="text-blue-600 text-sm">Admin</span>' : ''}
                </div>
                <div>
                  <label class="text-sm">
                    <input type="checkbox" \${user.location_tracking_enabled ? 'checked' : ''} 
                           onchange="toggleLocation('\${user.id}', this.checked)">
                    Location Tracking
                  </label>
                </div>
              </div>
            \`).join('');
            document.getElementById('usersList').innerHTML = html;
          } catch (error) {
            console.error('Error loading users:', error);
          }
        }

        async function toggleLocation(userId, enabled) {
          try {
            await fetch(\`/api/admin/users/\${userId}/location\`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + authToken
              },
              body: JSON.stringify({ enabled })
            });
          } catch (error) {
            console.error('Error toggling location:', error);
          }
        }

        loadUsers();
      </script>
    </body>
    </html>
  `);
});

// ==================== START SERVER ====================

async function start() {
  try {
    console.log('Starting SecureChat server...');
    
    // Initialize database
    const schema = await initializeDatabase();
    console.log('\nPlease run this SQL in your Supabase SQL Editor:');
    console.log('=' .repeat(80));
    console.log(schema);
    console.log('=' .repeat(80));
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✓ Server running on port ${PORT}`);
      console.log(`✓ Admin dashboard: http://localhost:${PORT}/admin`);
      console.log(`✓ Socket.io ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
