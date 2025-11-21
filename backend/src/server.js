const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware
const sessionMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============= AUTH ENDPOINTS =============

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user from Supabase
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, username')
      .eq('email', email)
      .single();

    if (userError || !users) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const token = jwt.sign(
      { id: users.id, email: users.email, username: users.username },
      process.env.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', users.id);

    res.json({ token, user: { id: users.id, email: users.email, username: users.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register endpoint (for first admin setup)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username required' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash,
          username,
          is_admin: false
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate token
    const token = jwt.sign(
      { id: data[0].id, email: data[0].email, username: data[0].username },
      process.env.SESSION_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: data[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============= USER MANAGEMENT ENDPOINTS =============

// Get all users (with pagination)
app.get('/api/users', sessionMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      users,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
app.get('/api/users/:id', sessionMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user
app.post('/api/users', sessionMiddleware, async (req, res) => {
  try {
    const { email, username, account_name, billing_plan, permissions } = req.body;

    if (!email || !username) {
      return res.status(400).json({ error: 'Email and username required' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          username,
          password_hash,
          creator_id: req.user.id,
          account_name: account_name || '',
          billing_plan: billing_plan || 'basic',
          permissions: permissions || {
            can_create_objects: false,
            can_change_password: true,
            can_send_sms: false,
            is_enabled: true,
            can_change_settings: false
          }
        }
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      user: data[0],
      tempPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.put('/api/users/:id', sessionMiddleware, async (req, res) => {
  try {
    const { username, account_name, billing_plan, permissions, host_mask } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (account_name) updateData.account_name = account_name;
    if (billing_plan) updateData.billing_plan = billing_plan;
    if (permissions) updateData.permissions = permissions;
    if (host_mask) updateData.host_mask = host_mask;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', sessionMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============= STREAM TOKEN ENDPOINT =============

// Legacy endpoint for Stream token generation
app.post('/api/auth/stream-token', async (req, res) => {
  try {
    const { userId, userName, userImage } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: 'userId and userName are required' });
    }

    const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // Note: Stream SDK integration would go here
    // For now, return a mock token structure
    res.json({
      token: 'mock-token-' + sanitizedUserId,
      userId: sanitizedUserId,
      apiKey: process.env.STREAM_API_KEY || 'mock-key'
    });
  } catch (error) {
    console.error('Stream token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    supabase: process.env.SUPABASE_URL ? 'configured' : 'not-configured'
  });
});

// Serve index on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Web UI available at http://localhost:${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? 'Configured' : 'Missing'}`);
});
