# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in WorldRisk Nexus Coms, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Include detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Measures

### Authentication & Authorization
- JWT-based session tokens with configurable expiration
- Server-side Stream token generation (API secrets never exposed to clients)
- Password hashing using bcrypt
- Email verification codes for authentication
- Session middleware protecting all sensitive endpoints

### Dependency Security
- **Automated npm audit on server startup**: Vulnerabilities logged and alerted
- **Security Dashboard**: On-demand vulnerability scanning via admin panel
- **CI/CD Integration**: Recommended npm audit in deployment pipelines

### API Security
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Rate limiting on authentication endpoints (recommended)
- API traffic monitoring with anomaly detection

### Data Protection
- Environment variables for all sensitive configuration
- Secrets stored in Replit Secrets (encrypted at rest)
- No credentials logged or exposed in error messages
- `.gitignore` excludes `.env` files and backups

### Monitoring & Alerting
- Real-time API traffic monitoring
- Error rate tracking
- Security alerts for:
  - Exposed secrets in codebase
  - Critical/high npm vulnerabilities
  - Repeated authentication failures
  - Suspicious request patterns
  - System file integrity changes

## Automated Security Scanning

### On Every Server Start
The backend automatically runs security checks:
```
[SECURITY] Running automated dependency audit...
[SECURITY] Audit complete: X vulnerabilities found
  - Critical: X
  - High: X
  - Moderate: X
  - Low: X
```

### Security Dashboard Features
Access via Admin Panel > Security tab:
- **Secrets Scanner**: Detects exposed API keys, passwords, tokens
- **NPM Audit**: Dependency vulnerability scanning
- **Traffic Monitor**: Request patterns and error rates
- **Integrity Check**: File hash verification
- **Recommendations**: Configuration security suggestions

## Best Practices

### For Developers
1. Never commit `.env` files or secrets
2. Use environment variables for all sensitive data
3. Run `npm audit` before commits
4. Review dependency updates for security patches
5. Test authentication flows after changes

### For Deployment
1. Set strong `SESSION_SECRET` (32+ characters)
2. Configure proper CORS origins
3. Enable HTTPS in production
4. Set up monitoring and alerting
5. Regular security audits

## Security Headers (Recommended)

Add these headers in production:
```javascript
// helmet middleware
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
  }
}));
```

## Dependency Audit Commands

```bash
# Check for vulnerabilities
npm audit

# Auto-fix where possible
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force

# JSON output for CI/CD
npm audit --json

# Only fail on high/critical
npm audit --audit-level=high
```

## Version History

- **1.0** (November 2025): Initial security implementation
  - Automated npm audit on startup
  - Security Dashboard with scanning features
  - API traffic monitoring
  - Security alerts system
