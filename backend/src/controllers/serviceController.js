const BILLING_PLANS = {
  basic: {
    name: 'Basic',
    tier: 1,
    permissions: {
      can_create_groups: false,
      can_access_cms: false,
      can_edit_profile: false,
      location_tracking: 'active_only',
      contact_list: 'allowed_only',
      group_management: 'backend_only'
    },
    description: 'Restricted access for standard users'
  },
  admin: {
    name: 'Admin',
    tier: 2,
    permissions: {
      can_create_groups: true,
      can_access_cms: 'limited',
      can_edit_profile: true,
      location_tracking: 'full',
      contact_list: 'admin_and_below',
      group_management: 'frontend_admin'
    },
    description: 'Enhanced access for group administrators'
  },
  executive: {
    name: 'Executive',
    tier: 3,
    permissions: {
      can_create_groups: true,
      can_access_cms: true,
      can_edit_profile: true,
      location_tracking: 'full',
      contact_list: 'all',
      group_management: 'full_control',
      can_allocate_permissions: true
    },
    description: 'Full unrestricted access'
  }
};

const createServiceController = (supabase, cometchat, addLog, systemLogs, systemLogsTableExists) => {
  
  const getServicesStatus = async (req, res) => {
    const services = {
      cometchat: { status: "unknown", error: null, severity: null },
      supabase: { status: "unknown", error: null, severity: null },
      brevo: { status: "unknown", error: null, severity: null },
      expo: { status: "unknown", error: null, severity: null },
    };

    if (cometchat.isConfigured()) {
      services.cometchat.status = "connected";
      services.cometchat.appId = cometchat.COMETCHAT_APP_ID;
      services.cometchat.region = cometchat.COMETCHAT_REGION;
    } else {
      services.cometchat.status = "disconnected";
      services.cometchat.error = "CometChat not configured";
      services.cometchat.severity = "critical";
      services.cometchat.appId = null;
      services.cometchat.region = null;
      addLog("ERROR", "CometChat", "CometChat credentials not configured");
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { error } = await supabase.from("users").select("count");
        if (error) {
          services.supabase.status = "error";
          services.supabase.error = error.message;
          services.supabase.severity = "critical";
          addLog("ERROR", "Supabase", "Database query failed", error.message);
        } else {
          services.supabase.status = "connected";
        }
      } catch (e) {
        services.supabase.status = "error";
        services.supabase.error = "Database connection timeout";
        services.supabase.severity = "critical";
        addLog("ERROR", "Supabase", "Database connection timeout", e.message);
      }
    } else {
      services.supabase.status = "disconnected";
      services.supabase.error = "Supabase credentials not configured";
      services.supabase.severity = "critical";
      addLog("ERROR", "Supabase", "Credentials not configured");
    }

    if (process.env.BREVO_API_KEY) {
      services.brevo.status = "connected";
    } else {
      services.brevo.status = "disconnected";
      services.brevo.error = "Brevo API Key not configured - Email features disabled";
      services.brevo.severity = "minor";
      addLog("WARN", "Brevo", "Email service not configured - password reset emails disabled");
    }

    services.expo.status = "connected";

    res.json(services);
  };

  const getBillingPlans = async (req, res) => {
    res.json(BILLING_PLANS);
  };

  const getBillingPlan = async (req, res) => {
    const plan = req.params.plan.toLowerCase();
    if (BILLING_PLANS[plan]) {
      res.json(BILLING_PLANS[plan]);
    } else {
      res.status(404).json({ error: "Billing plan not found" });
    }
  };

  const checkPlanAccess = async (req, res) => {
    const plan = req.params.plan.toLowerCase();
    const feature = req.params.feature;
    
    const planConfig = BILLING_PLANS[plan] || BILLING_PLANS.basic;
    const permission = planConfig.permissions[feature];
    
    let canAccess = false;
    let accessLevel = 'none';
    
    if (permission === true || permission === 'full' || permission === 'all' || permission === 'full_control') {
      canAccess = true;
      accessLevel = 'full';
    } else if (permission === 'limited' || permission === 'admin_and_below' || permission === 'frontend_admin' || permission === 'active_only' || permission === 'allowed_only') {
      canAccess = true;
      accessLevel = 'limited';
    }
    
    res.json({ canAccess, accessLevel, permission });
  };

  const getLogs = async (req, res) => {
    try {
      const { filter, limit = 100, source: dbSource } = req.query;
      const limitNum = parseInt(limit) || 100;
      
      if (dbSource === 'database') {
        if (!supabase) {
          return res.status(500).json({ error: 'Database not configured' });
        }
        
        let query = supabase.from('system_logs').select('*').order('timestamp', { ascending: false }).limit(limitNum);
        
        if (filter) {
          if (filter === 'ERROR' || filter === 'WARN' || filter === 'INFO') {
            query = query.contains('metadata', { level: filter });
          } else {
            query = query.ilike('action', `%${filter}%`);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Supabase logs fetch error:', error.message);
          return res.status(500).json({ error: 'Failed to fetch logs from database: ' + error.message });
        }
        
        const formattedLogs = (data || []).map(log => ({
          timestamp: log.timestamp,
          level: log.metadata?.level || 'INFO',
          source: log.metadata?.source || log.action || 'System',
          message: log.metadata?.message || log.details || '',
          details: log.details,
          user: log.user_email,
          ip: log.ip_address
        }));
        return res.json(formattedLogs);
      }
      
      let filteredLogs = systemLogs;

      if (filter) {
        if (filter === "ERROR" || filter === "WARN" || filter === "INFO") {
          filteredLogs = systemLogs.filter((log) => log.level === filter);
        } else {
          filteredLogs = systemLogs.filter((log) =>
            log.source.toLowerCase().includes(filter.toLowerCase()),
          );
        }
      }

      res.json(filteredLogs.slice(0, limitNum));
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  };

  const clearLogs = async (req, res) => {
    try {
      systemLogs.length = 0;
      res.json({ message: "Logs cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  };

  const registerPushToken = async (req, res) => {
    try {
      const { push_token } = req.body;
      const userId = req.user.id;

      if (!push_token) {
        return res.status(400).json({ error: "Push token required" });
      }

      const { error } = await supabase
        .from("users")
        .update({ push_token: push_token })
        .eq("id", userId);

      if (error) {
        console.error('[PUSH] Failed to save push token:', error);
        return res.status(500).json({ error: "Failed to register push token" });
      }

      console.log(`[PUSH] Registered push token for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error('[PUSH] Register token error:', error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  };

  const getHealth = (req, res) => {
    res.json({ status: "ok", supabase: "configured" });
  };

  const getRoot = (req, res) => {
    res.json({ status: "NexusComs Hybrid API running", mode: "API & CMS" });
  };

  return {
    getServicesStatus,
    getBillingPlans,
    getBillingPlan,
    checkPlanAccess,
    getLogs,
    clearLogs,
    registerPushToken,
    getHealth,
    getRoot
  };
};

module.exports = { createServiceController, BILLING_PLANS };
