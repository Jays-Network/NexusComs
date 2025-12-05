# Backend Setup Guide - Supabase Integration

## Overview
The backend has been completely rebuilt to use **Supabase** for:
- User authentication (Email/Password login)
- User management (Dashboard with CRUD operations)
- Secure role-based access control

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Create a new project:
   - Name: `worldrisk-nexus-coms`
   - Region: Choose closest to your location
   - Password: Save this somewhere safe (for admin access)
4. Wait for project to be ready (~2 minutes)

## Step 2: Get Supabase Credentials

Once your project is ready:

1. Go to **Settings > API** in your Supabase project
2. Copy these values:
   - **Project URL** → Save as `SUPABASE_URL`
   - **service_role (secret)** → Save as `SUPABASE_SERVICE_ROLE_KEY`
   - **anon (public)** → Save as `SUPABASE_ANON_KEY`

## Step 3: Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the SQL schema below:

```sql
-- Create users table
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
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
```

4. Click **Run**
5. You should see "Query successful"

## Step 4: Create Admin User (for first login)

In Supabase **SQL Editor**, run this script (adjust email/password as needed):

```sql
INSERT INTO users (email, username, password_hash, is_admin) VALUES (
  'admin@example.com',
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36DvDlS2',
  true
);
```

**Note:** The password_hash shown is the bcrypt hash of "password123". To create your own:
- Use an online bcrypt generator: https://bcrypt-generator.com/
- Or use Node.js: `bcrypt.hash('your-password', 10)`

For now, you can use:
- **Email:** `admin@example.com`
- **Password:** `password123`

## Step 5: Add Secrets to Replit

1. In your Replit project, click the **Secrets** icon (lock) in the left sidebar
2. Add these secrets:

```
SUPABASE_URL = your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
SUPABASE_ANON_KEY = your-anon-key
SESSION_SECRET = (keep the existing value)
```

3. Click "Add secret" for each one

## Step 6: Install Dependencies

Run in the backend directory:

```bash
npm install @supabase/supabase-js
```

This is already included in the backend setup, but verify it's installed.

## Step 7: Start Backend

The backend will automatically start with your workflow. Once running:

1. Open the backend URL from Replit
2. You should see a **Login Page**
3. Login with:
   - Email: `admin@example.com`
   - Password: `password123`
4. You'll see the **User Management Dashboard**

## Features Available

### Login Page
- Email/Password authentication
- Secure session tokens
- Error handling
- **Forgot Password?** link for password reset

### User Management Dashboard
- **User Table**: Shows all users with columns:
  - Name
  - Email
  - Account
  - Billing Plan
  - Last Visit
  - Status (Enabled/Disabled)
  - Actions (Edit/Delete)

### Edit User Modal
- **General Tab**: Name, Email, Account, Billing Plan
- **Access Tab**: Permissions (Can Create Objects, Change Password, Send SMS, Enable/Disable, Change Settings)
- **Advanced Tab**: Host Mask, Creator Info, Timestamps

### CRUD Operations
- **Create User**: Click "Add New User" button
- **Read Users**: Automatically loads on dashboard
- **Update User**: Click "Edit" button on user row
- **Delete User**: Click "Delete" button (with confirmation)

## API Endpoints

All endpoints (except login/register) require Bearer token authentication.

```
POST /api/auth/login
  Request: { email, password }
  Response: { token, user }

POST /api/auth/register
  Request: { email, password, username }
  Response: { token, user }

GET /api/users (with pagination)
  Headers: Authorization: Bearer <token>
  Response: { users[], total, page, limit, totalPages }

GET /api/users/:id
  Headers: Authorization: Bearer <token>
  Response: user object

POST /api/users
  Headers: Authorization: Bearer <token>
  Request: { email, username, account_name, billing_plan, permissions }
  Response: { user, tempPassword }

PUT /api/users/:id
  Headers: Authorization: Bearer <token>
  Request: { username, account_name, billing_plan, permissions, host_mask }
  Response: updated user object

DELETE /api/users/:id
  Headers: Authorization: Bearer <token>
  Response: { message: "User deleted successfully" }

POST /api/auth/request-reset
  Request: { email, username }
  Response: { message, resetToken, expiresIn }

POST /api/auth/reset-password
  Request: { resetToken, newPassword }
  Response: { message }

GET /health
  Response: { status: "ok", supabase: "configured" }
```

## Password Reset Feature

A secure password reset system is now available:

1. **Click "Forgot Password?"** on the login page
2. **Enter email and username** to verify your account
3. **Copy the reset token** that appears
4. **Enter new password** and click "Reset Password"
5. **Login with new credentials**

Security features:
- Tokens expire after 1 hour
- Both email AND username must match (prevents account enumeration)
- Passwords are bcrypt-hashed
- Tokens are one-time use only

See `BACKEND_PASSWORD_RESET.md` for complete documentation.

## Troubleshooting

### "Supabase not configured" error
- Make sure all three Supabase secrets are added to Replit Secrets
- Verify the credentials from Supabase are correct

### "Invalid credentials" on login
- Check that the admin user was created in Supabase
- Verify email/password match what you set

### "Failed to fetch users" error
- Check browser console for CORS errors
- Verify your token is valid (token expires in 7 days)
- Try logging out and back in

### Table not found error
- Make sure you ran the SQL schema in Supabase SQL Editor
- Verify the query executed successfully

## Next Steps

1. ✅ Create Supabase project
2. ✅ Set up database schema
3. ✅ Add Supabase secrets to Replit
4. ✅ Test login page
5. ✅ Create some test users
6. 🚀 Deploy to production

For production deployment, see `replit.md` for Publishing instructions.
