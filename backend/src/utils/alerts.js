const fs = require('fs');
const path = require('path');

const alerts = [];
const MAX_ALERTS = 500;
const LOG_FILE = path.join(__dirname, '../../logs/security-alerts.log');

const ALERT_THRESHOLDS = {
  traffic_spike: { threshold: 3, window: 30000 },
  error_rate: { threshold: 10, window: 60000 },
  secret_leak: { threshold: 1, window: 0 },
  vulnerability: { threshold: 1, window: 0 }
};

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

function addSecurityAlert(type, message, severity = 'medium') {
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    severity,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };
  
  alerts.unshift(alert);
  
  if (alerts.length > MAX_ALERTS) {
    alerts.pop();
  }
  
  writeToLog(alert);
  
  console.log(`[SECURITY ALERT] [${severity.toUpperCase()}] ${type}: ${message}`);
  
  return alert;
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

function getAlerts(options = {}) {
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

function acknowledgeAlert(alertId) {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    return true;
  }
  return false;
}

function clearAlerts() {
  alerts.length = 0;
}

function getAlertStats() {
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

module.exports = {
  addSecurityAlert,
  getAlerts,
  acknowledgeAlert,
  clearAlerts,
  getAlertStats,
  checkTrafficSpike,
  checkErrorRate
};
