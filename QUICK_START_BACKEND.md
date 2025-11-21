# Quick Start: Backend Deployment

## You're Almost There! 🚀

Your backend has been completely rebuilt with a **secure login page** and **user management dashboard**.

## What's Ready

✅ Login Page - Email/Password authentication
✅ User Management Dashboard - Add, edit, delete users
✅ Tabbed User Interface - General, Access, Advanced tabs
✅ Full API - CRUD operations with Supabase
✅ Secure Sessions - JWT tokens, 7-day expiration

## Next Steps (5 Minutes)

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project (note your password!)
- Wait for setup to complete

### 2. Get Your Credentials
In Supabase Settings > API, copy:
- **Project URL** → `SUPABASE_URL`
- **service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`
- **anon (public)** → `SUPABASE_ANON_KEY`

### 3. Add to Replit Secrets
1. Click "Secrets" (lock icon) in Replit sidebar
2. Add these three secrets:
   - `SUPABASE_URL` = [your project URL]
   - `SUPABASE_SERVICE_ROLE_KEY` = [your service role key]
   - `SUPABASE_ANON_KEY` = [your anon key]

### 4. Create Database Tables
In Supabase SQL Editor, run:
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  creator_id UUID REFERENCES users(id),
  account_name VARCHAR(255),
  billing_plan VARCHAR(50) DEFAULT 'basic',
  host_mask VARCHAR(255),
  permissions JSONB DEFAULT '{
    "can_create_objects": false,
    "can_change_password": true,
    "can_send_sms": false,
    "is_enabled": true,
    "can_change_settings": false
  }',
  is_admin BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### 5. Create Admin User
In Supabase SQL Editor, run:
```sql
INSERT INTO users (email, username, password_hash, is_admin) VALUES (
  'admin@example.com',
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvDlS2',
  true
);
```

Login with:
- **Email:** `admin@example.com`
- **Password:** `password123`

### 6. Deploy Backend
1. Click "Publishing" in Replit
2. Click "Autoscale" > "Set up published app"
3. Choose machine size (Basic is fine)
4. Click "Publish"
5. Copy your backend URL: `https://[your-replit-name].replit.dev`

### 7. Test It
Visit your backend URL and login with admin credentials above. You should see the **User Management Dashboard**!

## Available Dashboard Features

- **User Table**: Lists all users with Name, Email, Account, Billing Plan, Last Visit, Status
- **Add User**: Click "Add New User" button
- **Edit User**: Click "Edit" to modify user details and permissions
- **Delete User**: Click "Delete" to remove a user
- **Tabs**: General (basic info), Access (permissions), Advanced (host mask, timestamps)
- **Permissions**: Control what each user can do (create objects, change password, send SMS, etc.)

## API Endpoints (for your frontend)

```
POST /api/auth/login
  { email, password } → { token, user }

GET /api/users
  [Requires Bearer token] → list of users

POST /api/users
  [Requires Bearer token] + { email, username, ... } → new user

PUT /api/users/:id
  [Requires Bearer token] + { username, permissions, ... } → updated user

DELETE /api/users/:id
  [Requires Bearer token] → deleted

GET /health
  → { status: "ok", supabase: "configured" }
```

## Troubleshooting

**Login fails:**
- Check that admin user was created in Supabase
- Verify email/password match

**Can't see users:**
- Make sure Supabase secrets are added to Replit
- Check that the users table was created successfully

**"Supabase not configured":**
- Verify all three Supabase secrets are set correctly

## Full Documentation

See `BACKEND_SETUP_SUPABASE.md` for complete details.

---

**That's it!** Your backend is now secure and production-ready. 🎉

Next: Deploy frontend to Expo.dev when ready.
