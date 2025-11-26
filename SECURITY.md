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
[SECURITY] Backend audit: X vulnerabilities found
  - Critical: X
  - High: X
  - Moderate: X
  - Low: X
[SECURITY] Audit log: backend/logs/npm-audit.log
```

### Audit Log File
All npm audit results are persisted to `backend/logs/npm-audit.log` with:
- Timestamp of each audit run
- Severity breakdown (critical/high/moderate/low)
- Raw JSON output for detailed analysis

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

## Incident Response Process

### Severity Levels
| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **Critical** | Active breach or data exposure | Immediate (< 1 hour) | Exposed credentials, active attack |
| **High** | Potential breach or major vulnerability | < 4 hours | Critical npm vulnerability, auth bypass |
| **Medium** | Security weakness or anomaly | < 24 hours | Suspicious patterns, high error rates |
| **Low** | Minor issue or improvement needed | < 1 week | Configuration recommendations |

### Response Steps
1. **Identify**: Review security alerts in dashboard, check logs
2. **Contain**: Disable affected endpoints, rotate compromised credentials
3. **Investigate**: Analyze traffic logs, audit trail, check for data exposure
4. **Remediate**: Apply fixes, update dependencies, patch vulnerabilities
5. **Document**: Record incident details, timeline, actions taken
6. **Review**: Post-incident analysis, update procedures if needed

### Contact
- For security incidents, notify the development team immediately
- For external vulnerability reports, follow responsible disclosure (see above)

## Secret Rotation Procedures

### Regular Rotation Schedule
| Secret | Rotation Frequency | Owner |
|--------|-------------------|-------|
| SESSION_SECRET | Every 90 days | Backend Admin |
| STREAM_API_SECRET | On compromise only | Stream.io Dashboard |
| SUPABASE_SERVICE_ROLE_KEY | On compromise only | Supabase Dashboard |
| BREVO_API_KEY | Every 90 days | Brevo Dashboard |

### Rotation Steps
1. **Generate new secret** in the respective service dashboard
2. **Update Replit Secrets** with new value
3. **Restart backend server** to load new secrets
4. **Verify** all functionality works with new credentials
5. **Revoke old secret** after confirming new one works

### Emergency Rotation (On Compromise)
1. **Immediately** revoke/regenerate the compromised secret
2. Update Replit Secrets
3. Restart all affected services
4. Check logs for unauthorized access during exposure window
5. Create security alert documenting the incident

## Audit Schedule

### Daily (Automated)
- npm audit on server startup
- API traffic monitoring
- Authentication failure tracking

### Weekly (Manual Review)
- Review security dashboard alerts
- Check for new npm vulnerabilities
- Review access logs for anomalies

### Monthly
- Full secret rotation review
- Dependency update assessment
- Security configuration audit

### Quarterly
- Penetration testing (recommended)
- Security policy review
- Incident response drill

## Log Retention Policy

| Log Type | Retention Period | Location |
|----------|-----------------|----------|
| npm-audit.log | 90 days | `backend/logs/npm-audit.log` |
| security-alerts.log | 90 days | `backend/logs/security-alerts.log` |
| In-memory traffic | 1 hour | Memory (auto-cleanup) |
| In-memory alerts | 500 max entries | Memory |

### Log Management
- Logs older than 90 days should be archived or deleted
- Sensitive data is never logged (passwords, tokens, API keys)
- Logs are stored locally and not transmitted externally

## Version History

- **1.1** (November 2025): Enhanced security hardening
  - Added helmet security headers
  - Implemented rate limiting on auth endpoints
  - Configured restrictive CORS
  - Added body-size limits
  - Documented incident response and secret rotation

- **1.0** (November 2025): Initial security implementation
  - Automated npm audit on startup
  - Security Dashboard with scanning features
  - API traffic monitoring
  - Security alerts system
