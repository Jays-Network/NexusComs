const { addSecurityAlert } = require('../utils/alerts');

const requestLog = [];
const ipFailures = new Map();
const endpointStats = new Map();
const MAX_LOG_SIZE = 10000;
const RATE_LIMIT_THRESHOLD = 100;
const FAILURE_THRESHOLD = 10;

const suspiciousPatterns = [
  /\.\.\//g,
  /<script/gi,
  /union\s+select/gi,
  /\bor\b\s+1\s*=\s*1/gi,
  /exec\s*\(/gi,
  /eval\s*\(/gi
];

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

function checkSuspiciousPatterns(req) {
  const url = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});
  const combined = url + body;
  
  for (const pattern of suspiciousPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(combined)) {
      return true;
    }
  }
  return false;
}

function securityMonitor(req, res, next) {
  const startTime = Date.now();
  const ip = getClientIp(req);
  const path = req.path;
  const method = req.method;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const isSuspicious = checkSuspiciousPatterns(req);
  if (isSuspicious) {
    addSecurityAlert('suspicious_request', `Suspicious request pattern from ${ip}: ${path}`, 'medium');
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    
    const entry = {
      timestamp: Date.now(),
      ip,
      method,
      path,
      statusCode,
      duration,
      userAgent: userAgent.substring(0, 100),
      isSuspicious
    };
    
    requestLog.push(entry);
    if (requestLog.length > MAX_LOG_SIZE) {
      requestLog.splice(0, requestLog.length - MAX_LOG_SIZE);
    }
    
    const endpointKey = `${method} ${path}`;
    const stats = endpointStats.get(endpointKey) || { count: 0, errors: 0, totalDuration: 0 };
    stats.count++;
    stats.totalDuration += duration;
    if (isError) stats.errors++;
    endpointStats.set(endpointKey, stats);
    
    if (statusCode === 401 || statusCode === 403) {
      const failures = (ipFailures.get(ip) || 0) + 1;
      ipFailures.set(ip, failures);
      
      if (failures >= FAILURE_THRESHOLD) {
        addSecurityAlert('repeated_failures', `IP ${ip} has ${failures} failed auth attempts`, 'high');
      }
    }
    
    const recentRequests = requestLog.filter(r => r.ip === ip && r.timestamp > Date.now() - 60000);
    if (recentRequests.length > RATE_LIMIT_THRESHOLD) {
      addSecurityAlert('rate_limit', `IP ${ip} exceeding rate limit: ${recentRequests.length} requests/min`, 'medium');
    }
  });
  
  next();
}

function getTrafficMetrics() {
  const now = Date.now();
  const tenMinAgo = now - 600000;
  const sixtyMinAgo = now - 3600000;
  
  const last10min = requestLog.filter(r => r.timestamp > tenMinAgo);
  const last60min = requestLog.filter(r => r.timestamp > sixtyMinAgo);
  
  const errors10min = last10min.filter(r => r.statusCode >= 400).length;
  const errors60min = last60min.filter(r => r.statusCode >= 400).length;
  
  const totalDuration = last10min.reduce((sum, r) => sum + r.duration, 0);
  const avgResponseTime = last10min.length > 0 ? Math.round(totalDuration / last10min.length) : 0;
  
  const topEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgDuration: Math.round(stats.totalDuration / stats.count),
      errorRate: Math.round((stats.errors / stats.count) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    last10min: { requests: last10min.length, errors: errors10min },
    last60min: { requests: last60min.length, errors: errors60min },
    rpm: Math.round(last10min.length / 10),
    errorRate: last10min.length > 0 ? Math.round((errors10min / last10min.length) * 100) : 0,
    avgResponseTime,
    topEndpoints
  };
}

function getSuspiciousActivity() {
  const now = Date.now();
  const recentFailures = Array.from(ipFailures.entries())
    .filter(([ip, count]) => count >= 3)
    .map(([ip, count]) => ({ ip, failures: count }))
    .slice(0, 10);
  
  const rateLimitWarnings = requestLog.filter(r => {
    const ipRequests = requestLog.filter(req => req.ip === r.ip && req.timestamp > now - 60000);
    return ipRequests.length > RATE_LIMIT_THRESHOLD / 2;
  }).length;
  
  const suspiciousReqs = requestLog
    .filter(r => r.isSuspicious && r.timestamp > now - 3600000)
    .slice(0, 20)
    .map(r => ({
      timestamp: new Date(r.timestamp).toISOString(),
      ip: r.ip,
      path: r.path,
      method: r.method
    }));
  
  return {
    failedIps: recentFailures,
    rateLimitWarnings,
    patterns: suspiciousReqs
  };
}

function resetMetrics() {
  requestLog.length = 0;
  ipFailures.clear();
  endpointStats.clear();
}

setInterval(() => {
  const oneHourAgo = Date.now() - 3600000;
  while (requestLog.length > 0 && requestLog[0].timestamp < oneHourAgo) {
    requestLog.shift();
  }
  
  for (const [ip, count] of ipFailures.entries()) {
    if (count < FAILURE_THRESHOLD) {
      ipFailures.delete(ip);
    }
  }
}, 300000);

module.exports = {
  securityMonitor,
  getTrafficMetrics,
  getSuspiciousActivity,
  resetMetrics
};
