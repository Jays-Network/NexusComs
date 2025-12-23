const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const alerts = [];
const MAX_ALERTS = 500;
const LOG_FILE = path.join(__dirname, '../../logs/security-alerts.log');

const ALERT_THRESHOLDS = {
  traffic_spike: { threshold: 3, window: 30000 },
  error_rate: { threshold: 10, window: 60000 },
  secret_leak: { threshold: 1, window: 0 },
  vulnerability: { threshold: 1, window: 0 }
};

const acknowledgedIPs = new Map();
const IP_ACKNOWLEDGE_DURATION = 24 * 60 * 60 * 1000;

function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
    }
  }
}

function isIPAcknowledged(ip) {
  const acknowledged = acknowledgedIPs.get(ip);
  if (!acknowledged) return false;
  if (Date.now() - acknowledged.timestamp > IP_ACKNOWLEDGE_DURATION) {
    acknowledgedIPs.delete(ip);
    return false;
  }
  return true;
}

function extractIPFromMessage(message) {
  const ipMatch = message.match(/IP\s+([\d.]+)/);
  return ipMatch ? ipMatch[1] : null;
}

async function addSecurityAlert(type, message, severity = 'medium', sourceIp = null) {
  const extractedIp = sourceIp || extractIPFromMessage(message);
  
  if (type === 'repeated_failures' && extractedIp && isIPAcknowledged(extractedIp)) {
    console.log(`[SECURITY] Skipping alert for acknowledged IP: ${extractedIp}`);
    return null;
  }
  
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    severity,
    timestamp: new Date().toISOString(),
    acknowledged: false,
    source_ip: extractedIp,
    metadata: {}
  };
  
  alerts.unshift(alert);
  
  if (alerts.length > MAX_ALERTS) {
    alerts.pop();
  }
  
  writeToLog(alert);
  await persistToSupabase(alert);
  
  console.log(`[SECURITY ALERT] [${severity.toUpperCase()}] ${type}: ${message}`);
  
  return alert;
}

async function persistToSupabase(alert) {
  if (!supabase) return;
  
  try {
    await supabase.from('security_alerts').upsert({
      id: alert.id,
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged || false,
      acknowledged_at: alert.acknowledgedAt || null,
      acknowledged_by_user_id: alert.acknowledgedBy || null,
      acknowledged_by_user_email: alert.acknowledgedByEmail || null,
      source_ip: alert.source_ip,
      metadata: alert.metadata || {}
    });
  } catch (error) {
    console.error('Failed to persist alert to Supabase:', error.message);
  }
}

function writeToLog(alert) {
  try {
    ensureLogDir();
    const logEntry = JSON.stringify(alert) + '\n';
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write security alert to log:', error.message);
  }
}

async function getAlerts(options = {}) {
  if (supabase && options.fromDatabase) {
    try {
      let query = supabase.from('security_alerts').select('*').order('timestamp', { ascending: false }).limit(100);
      
      if (options.type) {
        query = query.eq('type', options.type);
      }
      if (options.severity) {
        query = query.eq('severity', options.severity);
      }
      if (options.unacknowledged) {
        query = query.eq('acknowledged', false);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        return data.map(dbAlert => ({
          id: dbAlert.id,
          type: dbAlert.type,
          message: dbAlert.message,
          severity: dbAlert.severity,
          timestamp: dbAlert.timestamp,
          acknowledged: dbAlert.acknowledged,
          acknowledgedAt: dbAlert.acknowledged_at,
          acknowledgedBy: dbAlert.acknowledged_by_user_id,
          acknowledgedByEmail: dbAlert.acknowledged_by_user_email,
          source_ip: dbAlert.source_ip,
          metadata: dbAlert.metadata || {}
        }));
      }
    } catch (error) {
      console.error('Failed to fetch alerts from Supabase:', error.message);
    }
  }
  
  let result = [...alerts];
  
  if (options.type) {
    result = result.filter(a => a.type === options.type);
  }
  
  if (options.severity) {
    result = result.filter(a => a.severity === options.severity);
  }
  
  if (options.unacknowledged) {
    result = result.filter(a => !a.acknowledged);
  }
  
  if (options.since) {
    const sinceDate = new Date(options.since);
    result = result.filter(a => new Date(a.timestamp) > sinceDate);
  }
  
  return result;
}

async function acknowledgeAlert(alertId, adminUser = null) {
  const alert = alerts.find(a => a.id === alertId);
  const now = new Date().toISOString();
  
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = now;
    if (adminUser) {
      alert.acknowledgedBy = adminUser.id || adminUser.username;
      alert.acknowledgedByEmail = adminUser.email;
    }
    
    if (alert.source_ip) {
      acknowledgedIPs.set(alert.source_ip, {
        timestamp: Date.now(),
        acknowledgedBy: adminUser ? adminUser.email : 'system'
      });
    }
  }
  
  if (supabase) {
    try {
      await supabase.from('security_alerts').update({
        acknowledged: true,
        acknowledged_at: now,
        acknowledged_by_user_id: adminUser ? (adminUser.id || adminUser.username) : null,
        acknowledged_by_user_email: adminUser ? adminUser.email : null
      }).eq('id', alertId);
    } catch (error) {
      console.error('Failed to update alert in Supabase:', error.message);
    }
  }
  
  return !!alert;
}

async function acknowledgeAllForIP(ip, adminUser = null) {
  const now = new Date().toISOString();
  let count = 0;
  
  for (const alert of alerts) {
    if (alert.source_ip === ip && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedAt = now;
      if (adminUser) {
        alert.acknowledgedBy = adminUser.id || adminUser.username;
        alert.acknowledgedByEmail = adminUser.email;
      }
      count++;
    }
  }
  
  acknowledgedIPs.set(ip, {
    timestamp: Date.now(),
    acknowledgedBy: adminUser ? adminUser.email : 'system'
  });
  
  if (supabase) {
    try {
      await supabase.from('security_alerts').update({
        acknowledged: true,
        acknowledged_at: now,
        acknowledged_by_user_id: adminUser ? (adminUser.id || adminUser.username) : null,
        acknowledged_by_user_email: adminUser ? adminUser.email : null
      }).eq('source_ip', ip).eq('acknowledged', false);
    } catch (error) {
      console.error('Failed to bulk update alerts in Supabase:', error.message);
    }
  }
  
  return count;
}

function clearAlerts() {
  alerts.length = 0;
}

async function getAlertStats() {
  const now = new Date();
  const oneHourAgo = new Date(now - 3600000);
  const oneDayAgo = new Date(now - 86400000);
  
  const hourlyAlerts = alerts.filter(a => new Date(a.timestamp) > oneHourAgo);
  const dailyAlerts = alerts.filter(a => new Date(a.timestamp) > oneDayAgo);
  
  return {
    total: alerts.length,
    lastHour: hourlyAlerts.length,
    last24Hours: dailyAlerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    acknowledgedIPs: Array.from(acknowledgedIPs.entries()).map(([ip, info]) => ({
      ip,
      acknowledgedBy: info.acknowledgedBy,
      expiresIn: Math.round((IP_ACKNOWLEDGE_DURATION - (Date.now() - info.timestamp)) / 60000) + ' minutes'
    })),
    bySeverity: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length
    },
    byType: alerts.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {})
  };
}

function checkTrafficSpike(currentRpm, previousRpm) {
  if (previousRpm > 0 && currentRpm > previousRpm * 3) {
    addSecurityAlert('traffic_spike', `Traffic spike detected: ${currentRpm} RPM (3x increase)`, 'high');
    return true;
  }
  return false;
}

function checkErrorRate(errorRate) {
  if (errorRate > ALERT_THRESHOLDS.error_rate.threshold) {
    addSecurityAlert('error_rate', `High error rate detected: ${errorRate}%`, 'high');
    return true;
  }
  return false;
}

async function addSystemLog(action, details, userInfo = null, ipAddress = null, metadata = {}) {
  const logEntry = {
    action,
    details,
    user_id: userInfo ? (userInfo.id || userInfo.username) : null,
    user_email: userInfo ? userInfo.email : null,
    ip_address: ipAddress,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  console.log(`[SYSTEM LOG] ${action}: ${details}`);
  
  if (supabase) {
    try {
      await supabase.from('system_logs').insert(logEntry);
    } catch (error) {
      console.error('Failed to persist system log:', error.message);
    }
  }
  
  return logEntry;
}

async function getSystemLogs(options = {}) {
  if (!supabase) {
    return [];
  }
  
  try {
    let query = supabase.from('system_logs').select('*').order('timestamp', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(100);
    }
    
    if (options.action) {
      query = query.eq('action', options.action);
    }
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    const { data, error } = await query;
    if (!error && data) {
      return data;
    }
  } catch (error) {
    console.error('Failed to fetch system logs:', error.message);
  }
  
  return [];
}

module.exports = {
  addSecurityAlert,
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllForIP,
  clearAlerts,
  getAlertStats,
  checkTrafficSpike,
  checkErrorRate,
  addSystemLog,
  getSystemLogs,
  isIPAcknowledged
};
