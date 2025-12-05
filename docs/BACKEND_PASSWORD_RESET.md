# Password Reset Feature

## Overview
A secure password reset functionality has been added to the backend. Users can reset their password by verifying their email and username.

## How It Works

### Step 1: Request Password Reset
1. Click "Forgot Password?" on the login page
2. Enter your **email** and **username**
3. Click "Request Reset"
4. System verifies the user exists and generates a reset token (valid for 1 hour)

### Step 2: Reset Your Password
1. Copy the reset token that appears
2. Enter your new password (minimum 6 characters)
3. Click "Reset Password"
4. Your password will be updated and you can login with the new credentials

## Security Features

✅ **Email & Username Verification**: Both email and username must match to prevent unauthorized resets
✅ **Token Expiration**: Reset tokens expire after 1 hour
✅ **One-Time Use**: Tokens are cleared after successful password reset
✅ **Bcrypt Hashing**: All passwords are securely hashed with bcrypt
✅ **No User Enumeration**: System doesn't reveal whether an account exists (privacy protection)

## Database Schema Update Required

Add these columns to your Supabase `users` table:

```sql
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;
```

Or run this migration in Supabase SQL Editor:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token);
```

## API Endpoints

### Request Password Reset
```
POST /api/auth/request-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe"
}

Response (200):
{
  "message": "Password reset requested successfully",
  "resetToken": "abc123...",
  "expiresIn": "1 hour"
}
```

### Complete Password Reset
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "resetToken": "abc123...",
  "newPassword": "newpassword123"
}

Response (200):
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

## Production Considerations

For production deployment, you should:

1. **Send Reset Link via Email**: Instead of displaying the token in the UI, send it via email with a link like:
   ```
   https://yourdomain.com/reset-password?token=abc123...
   ```

2. **Email Service**: Integrate with SendGrid, AWS SES, or similar to send emails

3. **Frontend Reset Page**: Create a web page that accepts the token from the URL

4. **Hide Token in Response**: Don't return the token in the API response; only send it via email

## Example Implementation (Production)

Install email service:
```bash
npm install nodemailer
```

Then use in backend:
```javascript
const nodemailer = require('nodemailer');

// In requestPasswordReset endpoint, after generating token:
await nodemailer.sendMail({
  to: users.email,
  subject: 'Password Reset Request',
  html: `Click here to reset: 
         https://yourdomain.com/reset?token=${resetToken}`
});
```

## Testing

Test with the admin account:
1. Go to login page
2. Click "Forgot Password?"
3. Enter:
   - Email: `admin@example.com`
   - Username: `admin`
4. Copy the token
5. Enter a new password
6. Click "Reset Password"
7. Login with new credentials

## Troubleshooting

**"Invalid or expired reset token"**
- Token may have expired (1 hour limit)
- Token may have already been used
- Try requesting a new reset

**"Email and username required"**
- Make sure both fields are filled

**"Password must be at least 6 characters"**
- Your new password is too short

**Database error**
- Make sure you added the password_reset_token and password_reset_expires columns to the users table
