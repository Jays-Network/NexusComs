const createEmergencyController = (supabase, cometchat, sendExpoPushNotifications, addLog) => {
  
  const createEmergencyGroup = async (req, res) => {
    try {
      const { name, description, alertProtocol, memberIds } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Emergency group name required" });
      }

      const { data: emergencyGroup, error: groupError } = await supabase
        .from("emergency_groups")
        .insert({
          name,
          description,
          alert_protocol: alertProtocol || "standard",
          created_by: req.user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (groupError) {
        console.error("Emergency group creation error:", groupError);
        addLog("ERROR", "Emergency Groups", "Failed to create emergency group", groupError.message);
        return res.status(500).json({ error: "Failed to create emergency group" });
      }

      if (memberIds && memberIds.length > 0) {
        try {
          const { data: users } = await supabase
            .from("users")
            .select("id, stream_id")
            .in("id", memberIds);

          if (users && users.length > 0) {
            const memberRecords = users.map(user => ({
              emergency_group_id: emergencyGroup.id,
              user_id: user.id,
              added_by: req.user.id,
              added_at: new Date().toISOString(),
            }));

            const { error: memberError } = await supabase
              .from("emergency_group_members")
              .insert(memberRecords);

            if (memberError) {
              console.warn("Error adding members to emergency group:", memberError);
            }
          }
        } catch (error) {
          console.error("Error processing emergency group members:", error);
          addLog("WARN", "Emergency Groups", "Error adding members to emergency group", error.message);
        }
      }

      res.status(201).json({ 
        message: "Emergency group created successfully with members", 
        emergencyGroup 
      });
    } catch (error) {
      console.error("Create emergency group error:", error);
      addLog("ERROR", "Emergency Groups", "Server error creating emergency group", error.message);
      res.status(500).json({ error: "Failed to create emergency group" });
    }
  };

  const getAllEmergencyGroups = async (req, res) => {
    try {
      const { data: emergencyGroups, error } = await supabase
        .from("emergency_groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: "Failed to fetch emergency groups" });
      }

      res.json(emergencyGroups || []);
    } catch (error) {
      console.error("Fetch emergency groups error:", error);
      res.status(500).json({ error: "Failed to fetch emergency groups" });
    }
  };

  const triggerEmergency = async (req, res) => {
    try {
      const { message, location, source_group_id, source_group_name } = req.body;
      const senderId = req.user.id;
      const senderName = req.user.username || req.user.email;

      console.log(`[EMERGENCY] Triggered by ${senderName} (${senderId})`);
      console.log(`[EMERGENCY] Message: ${message}`);
      console.log(`[EMERGENCY] Source group: ${source_group_name} (${source_group_id})`);

      const { data: senderData, error: senderError } = await supabase
        .from("users")
        .select("cometchat_uid")
        .eq("id", senderId)
        .single();

      const ownerUid = senderData?.cometchat_uid || cometchat.sanitizeUid(senderName);

      const { data: usersWithAccess, error: usersError } = await supabase
        .from("users")
        .select("id, username, email, cometchat_uid, push_token, permissions");

      if (usersError) {
        console.error('[EMERGENCY] Failed to fetch users:', usersError);
        return res.status(500).json({ error: "Failed to fetch users" });
      }

      const emergencyUsers = usersWithAccess.filter(user => {
        const perms = user.permissions || {};
        return perms.emergency_access === true || 
               perms.can_send_emergency === true ||
               perms.can_receive_emergency === true ||
               perms.admin === true ||
               perms.superAdmin === true;
      });

      console.log(`[EMERGENCY] Found ${emergencyUsers.length} users with emergency access`);

      const targetUsers = emergencyUsers.length > 0 ? emergencyUsers : usersWithAccess;
      console.log(`[EMERGENCY] Target users: ${targetUsers.length}`);

      const timestamp = Date.now();
      const groupId = `emergency-${timestamp}`;
      const groupName = `Emergency: ${new Date().toLocaleString('en-ZA', { 
        day: '2-digit', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;

      console.log(`[EMERGENCY] Creating CometChat group: ${groupId}`);

      let cometChatGroup = null;
      try {
        cometChatGroup = await cometchat.createGroup(
          groupId,
          groupName,
          'private',
          `Emergency alert from ${senderName}: ${message}`,
          ownerUid
        );
        console.log('[EMERGENCY] CometChat group created:', cometChatGroup);
      } catch (groupError) {
        console.error('[EMERGENCY] Failed to create CometChat group:', groupError);
      }

      if (cometChatGroup) {
        const memberUids = targetUsers
          .filter(u => u.cometchat_uid && u.cometchat_uid !== ownerUid)
          .map(u => u.cometchat_uid);

        if (memberUids.length > 0) {
          try {
            await cometchat.addGroupMembers(groupId, memberUids);
            console.log(`[EMERGENCY] Added ${memberUids.length} members to group`);
          } catch (memberError) {
            console.error('[EMERGENCY] Failed to add members:', memberError);
          }
        }

        try {
          await cometchat.sendGroupMessage(
            groupId,
            `EMERGENCY ALERT\n\nFrom: ${senderName}\nMessage: ${message}\n${location ? `Location: ${location}` : ''}\n\nOriginal group: ${source_group_name || 'Direct'}`,
            ownerUid,
            { emergency: true, source_group_id, source_group_name }
          );
          console.log('[EMERGENCY] Initial message sent to group');
        } catch (msgError) {
          console.error('[EMERGENCY] Failed to send initial message:', msgError);
        }
      }

      let emergencyRecord = null;
      try {
        const { data: record, error: recordError } = await supabase
          .from("emergency_groups")
          .insert({
            name: groupName,
            description: message,
            created_by: senderId,
            cometchat_guid: groupId,
            source_group_id: source_group_id,
            is_active: true
          })
          .select()
          .single();

        if (!recordError && record) {
          emergencyRecord = record;
          console.log('[EMERGENCY] Database record created:', record.id);
        }
      } catch (dbError) {
        console.error('[EMERGENCY] Failed to save to database:', dbError);
      }

      const pushTokens = targetUsers
        .filter(u => u.push_token && u.id !== senderId)
        .map(u => u.push_token);

      console.log(`[EMERGENCY] Sending push to ${pushTokens.length} devices`);

      const pushResult = await sendExpoPushNotifications(
        pushTokens,
        'EMERGENCY ALERT',
        `${senderName}: ${message}`,
        {
          type: 'emergency',
          emergency_group_id: groupId,
          sender_name: senderName,
          message: message,
          source_group_id: source_group_id,
        }
      );

      addLog("EMERGENCY", "Server", `Emergency alert triggered by ${senderName}`, JSON.stringify({
        message,
        group_id: groupId,
        target_users: targetUsers.length,
        push_sent: pushResult.success,
        location
      }));

      res.json({
        success: true,
        emergency_group_id: groupId,
        emergency_group_name: groupName,
        members_added: targetUsers.length,
        push_notifications_sent: pushResult.success,
        database_record_id: emergencyRecord?.id
      });

    } catch (error) {
      console.error('[EMERGENCY] Trigger error:', error);
      addLog("ERROR", "Server", "Emergency trigger failed", error.message);
      res.status(500).json({ error: "Failed to trigger emergency alert" });
    }
  };

  const getActiveEmergencies = async (req, res) => {
    try {
      const { data: emergencies, error } = await supabase
        .from("emergency_groups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[EMERGENCY] Failed to fetch active emergencies:', error);
        return res.status(500).json({ error: "Failed to fetch emergencies" });
      }

      const enrichedEmergencies = await Promise.all(
        (emergencies || []).map(async (emergency) => {
          if (emergency.created_by) {
            const { data: userData } = await supabase
              .from("users")
              .select("username, email")
              .eq("id", emergency.created_by)
              .single();
            return { ...emergency, users: userData };
          }
          return { ...emergency, users: null };
        })
      );

      res.json({ emergencies: enrichedEmergencies });
    } catch (error) {
      console.error('[EMERGENCY] Get active error:', error);
      res.status(500).json({ error: "Failed to fetch emergencies" });
    }
  };

  const resolveEmergency = async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution_notes } = req.body;

      const { error } = await supabase
        .from("emergency_groups")
        .update({ 
          is_active: false,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution_notes
        })
        .eq("id", id);

      if (error) {
        return res.status(500).json({ error: "Failed to resolve emergency" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve emergency" });
    }
  };

  return {
    createEmergencyGroup,
    getAllEmergencyGroups,
    triggerEmergency,
    getActiveEmergencies,
    resolveEmergency
  };
};

module.exports = { createEmergencyController };
