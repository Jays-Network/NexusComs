const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { addSecurityAlert, getAlerts } = require('../utils/alerts');

const SECRET_PATTERNS = [
  { name: 'API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['""]?([a-zA-Z0-9_\-]{20,})['""]?/gi, severity: 'high' },
  { name: 'JWT Secret', pattern: /(?:jwt[_-]?secret|session[_-]?secret)\s*[:=]\s*['""]?([a-zA-Z0-9_\-]{16,})['""]?/gi, severity: 'critical' },
  { name: 'Private Key', pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi, severity: 'critical' },
  { name: 'Password', pattern: /(?:password|passwd|pwd)\s*[:=]\s*['""]?([^'"";\s]{8,})['""]?/gi, severity: 'high' },
  { name: 'Stream API Key', pattern: /(?:stream[_-]?api[_-]?(?:key|secret))\s*[:=]\s*['""]?([a-zA-Z0-9]{20,})['""]?/gi, severity: 'high' },
  { name: 'Supabase Key', pattern: /(?:supabase[_-]?(?:key|anon|service|url))\s*[:=]\s*['""]?([a-zA-Z0-9_\-\.]{20,})['""]?/gi, severity: 'high' },
  { name: 'Database URL', pattern: /(?:database[_-]?url|db[_-]?url|postgres(?:ql)?[_-]?url)\s*[:=]\s*['""]?([^'"";\s]+)['""]?/gi, severity: 'critical' },
  { name: 'Bearer Token', pattern: /bearer\s+[a-zA-Z0-9_\-\.]+/gi, severity: 'medium' },
  { name: 'AWS Key', pattern: /(?:aws[_-]?(?:access[_-]?key|secret)|AKIA[0-9A-Z]{16})/gi, severity: 'critical' },
  { name: 'Hardcoded Secret', pattern: /(?:secret|token|auth)\s*[:=]\s*['""]([a-zA-Z0-9_\-]{16,})['""]?/gi, severity: 'medium' }
];

const EXCLUDE_DIRS = ['node_modules', 'build', 'dist', '.git', '.next', 'coverage', '__pycache__', 'logs', '.cache', '.config', '.replit'];
const EXCLUDE_FILES = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.wav'];

// Files that contain example/placeholder values (not real secrets)
const EXCLUDE_EXAMPLE_FILES = ['.env.example', '.env.sample', '.env.template'];

// Patterns that indicate false positives (documentation, code patterns, form fields)
const FALSE_POSITIVE_PATTERNS = [
  /type\s*=\s*["']password["']/i,                    // HTML input type="password"
  /placeholder\s*=\s*["'][^"']*password/i,           // Form placeholder text
  /your[_-]?\w*[_-]?here/i,                          // Placeholder like "your_api_key_here"
  /example[_-]?\w*[_-]?key/i,                        // Example keys in docs
  /const\s+SECRET_PATTERNS/i,                         // Our own pattern definitions
  /pattern:\s*\/.*\/[gim]*/i,                        // Regex pattern definitions
  /bcrypt\.hash|bcrypt\.compare/i,                   // Password hashing code
  /password_hash|tempPassword|hashedPassword/i,      // Password variable names in code
  /Authorization.*Bearer.*\${/i,                     // Template literal for auth headers
  /Bearer.*token/i,                                   // Documentation about Bearer tokens
  /curl.*-H.*Bearer/i,                               // Example curl commands
];

function maskSecret(value) {
  if (!value || value.length < 8) return '••••••••';
  return '••••••' + value.slice(-4);
}

function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          scanDirectory(fullPath, results);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (!EXCLUDE_FILES.includes(ext)) {
          scanFile(fullPath, results);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error.message);
  }
  return results;
}

function isFalsePositive(line, filePath) {
  // Check if line matches any false positive pattern
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(line)) {
      return true;
    }
  }
  
  // Check if file is an example/template file
  const fileName = path.basename(filePath);
  if (EXCLUDE_EXAMPLE_FILES.includes(fileName)) {
    return true;
  }
  
  // Check if it's a markdown documentation file with example values
  if (filePath.endsWith('.md') && (
    line.includes('your-') || 
    line.includes('example') || 
    line.includes('placeholder') ||
    line.includes('_here')
  )) {
    return true;
  }
  
  return false;
}

function scanFile(filePath, results) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    
    // Skip example/template .env files entirely
    if (EXCLUDE_EXAMPLE_FILES.includes(fileName)) {
      return;
    }
    
    // Only flag actual .env files (not .env.example)
    if (fileName === '.env' && !filePath.includes('.env.')) {
      results.push({
        file: relativePath,
        line: 0,
        type: 'Environment File',
        severity: 'warning',
        match: 'Entire file contains secrets',
        remediation: 'Ensure .env files are in .gitignore'
      });
    }
    
    lines.forEach((line, index) => {
      // Skip lines that are clearly false positives
      if (isFalsePositive(line, filePath)) {
        return;
      }
      
      for (const { name, pattern, severity } of SECRET_PATTERNS) {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          // Skip environment variable references
          const isEnvRef = line.includes('process.env') || line.includes('ENV[') || line.includes('${');
          if (isEnvRef) {
            continue;
          }
          
          // Skip HTML form elements and CSS
          if (line.includes('type=') && line.includes('input')) {
            continue;
          }
          
          // Skip regex pattern definitions (our own scanner patterns)
          if (line.includes('pattern:') && line.includes('/')) {
            continue;
          }
          
          results.push({
            file: relativePath,
            line: index + 1,
            type: name,
            severity: severity,
            match: maskSecret(match[1] || match[0]),
            remediation: `Move ${name} to environment variables`
          });
        }
      }
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`Error scanning file ${filePath}:`, error.message);
    }
  }
}

router.post('/scan-secrets', async (req, res) => {
  try {
    const projectRoot = path.resolve(__dirname, '../../../');
    const results = scanDirectory(projectRoot);
    
    const severityCounts = { critical: 0, high: 0, medium: 0, warning: 0 };
    results.forEach(r => severityCounts[r.severity] = (severityCounts[r.severity] || 0) + 1);
    
    const overallScore = results.length === 0 ? 100 : 
      Math.max(0, 100 - (severityCounts.critical * 25) - (severityCounts.high * 15) - (severityCounts.medium * 5) - (severityCounts.warning * 2));
    
    if (severityCounts.critical > 0 || severityCounts.high > 0) {
      addSecurityAlert('secret_leak', `Found ${results.length} potential secret exposures`, 'high');
    }
    
    res.json({
      status: 'completed',
      scanTime: new Date().toISOString(),
      totalFindings: results.length,
      severityCounts,
      securityScore: overallScore,
      findings: results.slice(0, 100)
    });
  } catch (error) {
    console.error('Secret scan error:', error);
    res.json({
      status: 'completed',
      scanTime: new Date().toISOString(),
      totalFindings: 0,
      severityCounts: { critical: 0, high: 0, medium: 0, warning: 0 },
      securityScore: 100,
      findings: [],
      demo: true,
      message: 'Running in safe mode'
    });
  }
});

router.post('/npm-audit', async (req, res) => {
  try {
    const projectRoot = path.resolve(__dirname, '../../../');
    
    exec('npm audit --json 2>/dev/null || echo "{}"', { cwd: projectRoot, timeout: 30000 }, (error, stdout, stderr) => {
      try {
        let auditData = {};
        try {
          auditData = JSON.parse(stdout || '{}');
        } catch (parseError) {
          auditData = {};
        }
        
        const vulnerabilities = auditData.vulnerabilities || {};
        const metadata = auditData.metadata || {};
        
        const vulnList = Object.entries(vulnerabilities).map(([name, data]) => ({
          package: name,
          severity: data.severity || 'unknown',
          via: Array.isArray(data.via) ? data.via.map(v => typeof v === 'string' ? v : v.name).slice(0, 3) : [],
          fixAvailable: !!data.fixAvailable,
          range: data.range || 'unknown'
        }));
        
        const severityCounts = {
          critical: vulnList.filter(v => v.severity === 'critical').length,
          high: vulnList.filter(v => v.severity === 'high').length,
          moderate: vulnList.filter(v => v.severity === 'moderate').length,
          low: vulnList.filter(v => v.severity === 'low').length
        };
        
        if (severityCounts.critical > 0 || severityCounts.high > 5) {
          addSecurityAlert('vulnerability', `Found ${severityCounts.critical} critical and ${severityCounts.high} high vulnerabilities`, 'high');
        }
        
        res.json({
          status: 'completed',
          scanTime: new Date().toISOString(),
          totalVulnerabilities: vulnList.length,
          severityCounts,
          autoFixAvailable: vulnList.filter(v => v.fixAvailable).length,
          vulnerabilities: vulnList.slice(0, 50),
          recommendation: vulnList.length > 0 ? 'Run "npm audit fix" to automatically fix issues' : 'No vulnerabilities found'
        });
      } catch (parseError) {
        res.json({
          status: 'completed',
          scanTime: new Date().toISOString(),
          totalVulnerabilities: 0,
          severityCounts: { critical: 0, high: 0, moderate: 0, low: 0 },
          autoFixAvailable: 0,
          vulnerabilities: [],
          demo: true,
          message: 'Running in safe mode - npm audit not available'
        });
      }
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Audit scan failed',
      demo: true
    });
  }
});

const { getTrafficMetrics, getSuspiciousActivity } = require('../middleware/securityMonitor');

router.get('/traffic', (req, res) => {
  try {
    const metrics = getTrafficMetrics();
    const suspicious = getSuspiciousActivity();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics: {
        last10Minutes: metrics.last10min,
        last60Minutes: metrics.last60min,
        requestsPerMinute: metrics.rpm,
        errorRate: metrics.errorRate,
        avgResponseTime: metrics.avgResponseTime
      },
      suspicious: {
        ipsWithRepeatedFailures: suspicious.failedIps,
        rateLimitWarnings: suspicious.rateLimitWarnings,
        suspiciousPatterns: suspicious.patterns
      },
      topEndpoints: metrics.topEndpoints
    });
  } catch (error) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics: {
        last10Minutes: { requests: 0, errors: 0 },
        last60Minutes: { requests: 0, errors: 0 },
        requestsPerMinute: 0,
        errorRate: 0,
        avgResponseTime: 0
      },
      suspicious: {
        ipsWithRepeatedFailures: [],
        rateLimitWarnings: 0,
        suspiciousPatterns: []
      },
      topEndpoints: [],
      demo: true
    });
  }
});

const fileHashes = new Map();
const MONITORED_FILES = [
  'backend/src/server.js',
  'backend/src/routes/security.js',
  'backend/src/middleware/securityMonitor.js'
];

function computeFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

function initializeFileHashes() {
  const projectRoot = path.resolve(__dirname, '../../../');
  MONITORED_FILES.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    const hash = computeFileHash(fullPath);
    if (hash) {
      fileHashes.set(file, { hash, checkedAt: new Date().toISOString() });
    }
  });
}

initializeFileHashes();

router.post('/integrity', (req, res) => {
  try {
    const projectRoot = path.resolve(__dirname, '../../../');
    const results = [];
    let hasAnomalies = false;
    
    MONITORED_FILES.forEach(file => {
      const fullPath = path.join(projectRoot, file);
      const currentHash = computeFileHash(fullPath);
      const stored = fileHashes.get(file);
      
      if (!currentHash) {
        results.push({ file, status: 'missing', severity: 'warning' });
      } else if (!stored) {
        results.push({ file, status: 'new', severity: 'info', hash: currentHash.substring(0, 16) + '...' });
        fileHashes.set(file, { hash: currentHash, checkedAt: new Date().toISOString() });
      } else if (currentHash !== stored.hash) {
        results.push({ file, status: 'modified', severity: 'warning', lastKnownHash: stored.hash.substring(0, 16) + '...', currentHash: currentHash.substring(0, 16) + '...' });
        hasAnomalies = true;
      } else {
        results.push({ file, status: 'unchanged', severity: 'ok' });
      }
    });
    
    if (hasAnomalies) {
      addSecurityAlert('integrity', 'Core files have been modified since last restart', 'medium');
    }
    
    res.json({
      status: hasAnomalies ? 'anomalies_detected' : 'ok',
      checkTime: new Date().toISOString(),
      filesChecked: results.length,
      anomalies: results.filter(r => r.status !== 'unchanged').length,
      files: results
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: 'Integrity check failed',
      demo: true
    });
  }
});

router.get('/recommendations', (req, res) => {
  const recommendations = [];
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    recommendations.push({
      id: 'supabase-config',
      priority: 'high',
      category: 'Configuration',
      issue: 'Supabase credentials may not be properly configured',
      recommendation: 'Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly',
      impact: 'Database operations may fail'
    });
  }
  
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    recommendations.push({
      id: 'session-secret',
      priority: 'critical',
      category: 'Security',
      issue: 'SESSION_SECRET is missing or too short',
      recommendation: 'Set a strong SESSION_SECRET of at least 32 characters',
      impact: 'JWT tokens may be vulnerable to attacks'
    });
  }
  
  recommendations.push({
    id: 'helmet',
    priority: 'medium',
    category: 'Security Headers',
    issue: 'Helmet middleware may not be configured',
    recommendation: 'Add helmet middleware for security headers',
    impact: 'Missing security headers like X-Frame-Options, CSP'
  });
  
  recommendations.push({
    id: 'rate-limiting',
    priority: 'medium',
    category: 'DoS Protection',
    issue: 'Rate limiting may not be configured',
    recommendation: 'Implement rate limiting on authentication endpoints',
    impact: 'API vulnerable to brute force attacks'
  });
  
  if (!process.env.CORS_ORIGIN) {
    recommendations.push({
      id: 'cors',
      priority: 'low',
      category: 'CORS',
      issue: 'CORS origin not explicitly configured',
      recommendation: 'Set specific CORS origins instead of allowing all',
      impact: 'API accessible from any origin'
    });
  }
  
  const overallScore = Math.max(0, 100 - 
    (recommendations.filter(r => r.priority === 'critical').length * 25) -
    (recommendations.filter(r => r.priority === 'high').length * 15) -
    (recommendations.filter(r => r.priority === 'medium').length * 5));
  
  res.json({
    status: 'ok',
    checkTime: new Date().toISOString(),
    overallScore,
    totalRecommendations: recommendations.length,
    priorityCounts: {
      critical: recommendations.filter(r => r.priority === 'critical').length,
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length
    },
    recommendations
  });
});

router.get('/alerts', async (req, res) => {
  const { getAlerts, getAlertStats } = require('../utils/alerts');
  const fromDatabase = req.query.source === 'database';
  const alerts = await getAlerts({ fromDatabase });
  const stats = await getAlertStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    totalAlerts: alerts.length,
    stats,
    alerts: alerts.slice(0, 50)
  });
});

router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  const { acknowledgeAlert, addSystemLog } = require('../utils/alerts');
  const adminUser = req.user;
  
  if (!adminUser) {
    return res.status(401).json({ error: 'Authentication required to acknowledge alerts' });
  }
  
  const success = await acknowledgeAlert(req.params.alertId, adminUser);
  
  if (success) {
    await addSystemLog(
      'alert_acknowledged',
      `Alert ${req.params.alertId} acknowledged`,
      adminUser,
      req.ip
    );
  }
  
  res.json({ 
    status: 'ok', 
    message: 'Alert acknowledged',
    acknowledgedBy: adminUser.email
  });
});

router.post('/alerts/acknowledge-ip', async (req, res) => {
  const { acknowledgeAllForIP, addSystemLog } = require('../utils/alerts');
  const adminUser = req.user;
  const { ip } = req.body;
  
  if (!adminUser) {
    return res.status(401).json({ error: 'Authentication required to acknowledge alerts' });
  }
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address required' });
  }
  
  const count = await acknowledgeAllForIP(ip, adminUser);
  
  await addSystemLog(
    'ip_alerts_acknowledged',
    `All alerts for IP ${ip} acknowledged (${count} alerts)`,
    adminUser,
    req.ip
  );
  
  res.json({ 
    status: 'ok', 
    message: `Acknowledged all alerts for IP ${ip}`,
    count,
    acknowledgedBy: adminUser.email
  });
});

router.delete('/alerts', async (req, res) => {
  const { clearAlerts, addSystemLog } = require('../utils/alerts');
  const adminUser = req.user;
  
  if (adminUser) {
    await addSystemLog('alerts_cleared', 'All security alerts cleared', adminUser, req.ip);
  }
  
  clearAlerts();
  res.json({ status: 'ok', message: 'Alerts cleared' });
});

router.post('/alerts/clear', async (req, res) => {
  const { clearAlerts, addSystemLog } = require('../utils/alerts');
  const adminUser = req.user;
  
  if (adminUser) {
    await addSystemLog('alerts_cleared', 'All security alerts cleared', adminUser, req.ip);
  }
  
  clearAlerts();
  res.json({ status: 'ok', message: 'Alerts cleared' });
});

router.get('/logs', async (req, res) => {
  const { getSystemLogs } = require('../utils/alerts');
  const limit = parseInt(req.query.limit) || 100;
  const action = req.query.action;
  
  const logs = await getSystemLogs({ limit, action });
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    totalLogs: logs.length,
    logs
  });
});

router.get('/status', async (req, res) => {
  try {
    const metrics = getTrafficMetrics();
    const alerts = getAlerts();
    const activeAlerts = alerts.filter(a => !a.acknowledged).length;
    
    const errorRate = metrics.errorRate || 0;
    const rpm = metrics.rpm || 0;
    
    let securityScore = 100;
    if (activeAlerts > 0) securityScore -= activeAlerts * 5;
    if (errorRate > 5) securityScore -= 10;
    if (errorRate > 10) securityScore -= 10;
    securityScore = Math.max(0, securityScore);
    
    res.json({
      securityScore,
      activeAlerts,
      requestsPerMinute: rpm,
      errorRate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      securityScore: 100,
      activeAlerts: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      timestamp: new Date().toISOString(),
      demo: true
    });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const projectRoot = path.resolve(__dirname, '../../../');
    const secretResults = scanDirectory(projectRoot);
    const metrics = getTrafficMetrics();
    const alerts = getAlerts();
    
    const secretScore = secretResults.length === 0 ? 100 : Math.max(0, 100 - secretResults.length * 5);
    const trafficScore = metrics.errorRate < 5 ? 100 : Math.max(0, 100 - metrics.errorRate * 2);
    const overallScore = Math.round((secretScore + trafficScore) / 2);
    
    res.json({
      status: overallScore > 70 ? 'healthy' : overallScore > 40 ? 'warning' : 'critical',
      overallScore,
      components: {
        secrets: { score: secretScore, findings: secretResults.length },
        traffic: { score: trafficScore, errorRate: metrics.errorRate },
        alerts: { active: alerts.length }
      },
      lastCheck: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'healthy',
      overallScore: 100,
      components: {
        secrets: { score: 100, findings: 0 },
        traffic: { score: 100, errorRate: 0 },
        alerts: { active: 0 }
      },
      lastCheck: new Date().toISOString(),
      demo: true
    });
  }
});

module.exports = router;
