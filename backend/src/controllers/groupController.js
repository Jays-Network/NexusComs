const createGroupController = (supabase, cometchat, addLog) => {
  
  const getAllGroups = async (req, res) => {
    try {
      const userId = req.user?.id;
      const billingPlan = req.user?.billing_plan || 'basic';
      
      console.log(`[Groups] Fetching for user ${userId} with plan: ${billingPlan}`);
      
      let groups = [];
      let error = null;
      
      // TASK 2: Permission-based filtering
      if (billingPlan === 'executive') {
        // Executive users see ALL groups
        const result = await supabase
          .from("groups")
          .select("*")
          .order("created_at", { ascending: true });
        groups = result.data;
        error = result.error;
        console.log(`[Groups] Executive access: returning all ${groups?.length || 0} groups`);
      } else {
        // Admin/Basic users see ONLY groups they are members of
        const { data: memberGroups, error: memberError } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("user_id", userId);
        
        if (memberError) {
          console.error("Fetch user memberships error:", memberError);
          return res.status(500).json({ error: "Failed to fetch user memberships" });
        }
        
        const groupIds = (memberGroups || []).map(m => m.group_id);
        console.log(`[Groups] User ${userId} is member of groups:`, groupIds);
        
        if (groupIds.length === 0) {
          // User has no group memberships
          return res.json([]);
        }
        
        const result = await supabase
          .from("groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: true });
        groups = result.data;
        error = result.error;
        console.log(`[Groups] Restricted access: returning ${groups?.length || 0} groups`);
      }

      if (error) {
        console.error("Fetch groups error:", error);
        return res.status(500).json({ error: "Failed to fetch groups" });
      }

      // TASK 3: Get member counts for each group
      const groupIds = (groups || []).map(g => g.id);
      
      let memberCounts = {};
      if (groupIds.length > 0) {
        const { data: countData, error: countError } = await supabase
          .from("group_members")
          .select("group_id")
          .in("group_id", groupIds);
        
        if (!countError && countData) {
          // Count occurrences of each group_id
          countData.forEach(row => {
            memberCounts[row.group_id] = (memberCounts[row.group_id] || 0) + 1;
          });
        }
      }

      const groupsWithCounts = (groups || []).map(g => ({
        ...g,
        member_count: memberCounts[g.id] || 0,
        cometchat_group_id: g.cometchat_group_id || `group_${g.id}`
      }));

      res.json(groupsWithCounts);
    } catch (error) {
      console.error("Fetch groups error:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  };

  const getGroupById = async (req, res) => {
    try {
      const { groupId } = req.params;

      const { data: group, error } = await supabase
        .from("groups")
        .select(`
          *,
          group_members(user_id)
        `)
        .eq("id", groupId)
        .single();

      if (error || !group) {
        return res.status(404).json({ error: "Group not found" });
      }

      const memberIds = (group.group_members || []).map(m => m.user_id);
      
      res.json({
        ...group,
        memberIds,
        group_members: undefined
      });
    } catch (error) {
      console.error("Get group error:", error);
      res.status(500).json({ error: "Failed to get group" });
    }
  };

  const createGroup = async (req, res) => {
    try {
      const { name, description, parent_group_id, memberIds } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          parent_group_id: parent_group_id || null,
          created_by: req.user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (groupError) {
        console.error("Group creation error:", groupError);
        addLog("ERROR", "Groups", "Failed to create group", groupError.message);
        return res.status(500).json({ error: "Failed to create group" });
      }

      let cometchatGroupId = null;
      if (cometchat.isConfigured()) {
        try {
          const cometGroupId = `group_${group.id}`;
          const creatorUid = cometchat.sanitizeUid(req.user.email || req.user.id);
          
          await cometchat.createGroup(
            cometGroupId,
            name,
            'public',
            description || '',
            creatorUid
          );
          
          cometchatGroupId = cometGroupId;
          console.log(`[CometChat] Created group: ${cometGroupId}`);
          
          await supabase
            .from("groups")
            .update({ cometchat_group_id: cometGroupId })
            .eq("id", group.id);
            
          addLog("INFO", "CometChat", `Group created: ${name}`);
        } catch (chatError) {
          console.warn(`[CometChat] Could not create group: ${chatError.message}`);
          addLog("WARN", "CometChat", `Could not create chat group for ${name}`, chatError.message);
        }
      }

      if (memberIds && memberIds.length > 0) {
        try {
          const { data: users } = await supabase
            .from("users")
            .select("id, cometchat_uid, email")
            .in("id", memberIds);

          if (users && users.length > 0) {
            const memberRecords = users.map(user => ({
              group_id: group.id,
              user_id: user.id,
              joined_at: new Date().toISOString(),
            }));

            const { error: memberError } = await supabase
              .from("group_members")
              .insert(memberRecords);

            if (memberError) {
              console.warn("Error adding members to group:", memberError);
            }

            if (cometchat.isConfigured() && cometchatGroupId) {
              try {
                const memberUids = users
                  .map(u => u.cometchat_uid || cometchat.sanitizeUid(u.email || u.id))
                  .filter(uid => uid != null);
                
                if (memberUids.length > 0) {
                  await cometchat.addGroupMembers(cometchatGroupId, memberUids);
                  console.log(`Added ${memberUids.length} members to CometChat group`);
                  addLog("INFO", "CometChat", `Added ${memberUids.length} members to group ${name}`);
                }
              } catch (memberError) {
                console.warn(`Error adding members to CometChat: ${memberError.message}`);
                addLog("WARN", "CometChat", `Could not add members to group`, memberError.message);
              }
            }
          }
        } catch (error) {
          console.error("Error processing members:", error);
          addLog("WARN", "Groups", "Error adding members to group", error.message);
        }
      }

      res.status(201).json({ 
        message: "Group created successfully with members", 
        group: {
          ...group,
          cometchat_group_id: cometchatGroupId
        }
      });
    } catch (error) {
      console.error("Create group error:", error);
      addLog("ERROR", "Groups", "Server error creating group", error.message);
      res.status(500).json({ error: "Failed to create group" });
    }
  };

  const updateGroup = async (req, res) => {
    try {
      const { groupId } = req.params;
      const { name, description, parent_group_id, memberIds } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const { data: updatedGroup, error: updateError } = await supabase
        .from("groups")
        .update({
          name,
          description: description || null,
          parent_group_id: parent_group_id || null,
        })
        .eq("id", groupId)
        .select()
        .single();

      if (updateError) {
        console.error("Update group error:", updateError);
        addLog("ERROR", "Groups", "Failed to update group", updateError.message);
        return res.status(500).json({ error: "Failed to update group" });
      }

      if (cometchat.isConfigured()) {
        try {
          const cometGroupId = `group_${groupId}`;
          await cometchat.updateGroup(cometGroupId, name, description);
          console.log(`[CometChat] Updated group: ${cometGroupId}`);
        } catch (chatError) {
          console.warn(`[CometChat] Could not update group: ${chatError.message}`);
        }
      }

      if (memberIds && Array.isArray(memberIds)) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId);

        if (memberIds.length > 0) {
          const memberInserts = memberIds.map(userId => ({
            group_id: parseInt(groupId),
            user_id: userId,
            joined_at: new Date().toISOString()
          }));

          const { error: memberError } = await supabase
            .from("group_members")
            .insert(memberInserts);

          if (memberError) {
            console.warn("Error updating group members:", memberError);
          }

          if (cometchat.isConfigured()) {
            try {
              const cometGroupId = `group_${groupId}`;
              const memberUids = memberIds.map(id => cometchat.sanitizeUid(id));
              await cometchat.addGroupMembers(cometGroupId, memberUids);
              addLog("INFO", "CometChat", `Updated members for group ${name}`);
            } catch (memberError) {
              addLog("WARN", "CometChat", `Could not update group members`, memberError.message);
            }
          }
        }
      }

      addLog("INFO", "Groups", `Updated group: ${name}`, `ID: ${groupId}`);
      res.json({ message: "Group updated successfully", group: updatedGroup });
    } catch (error) {
      console.error("Update group error:", error);
      addLog("ERROR", "Groups", "Server error updating group", error.message);
      res.status(500).json({ error: "Failed to update group" });
    }
  };

  const deleteGroup = async (req, res) => {
    try {
      const { groupId } = req.params;

      async function getSubgroupIds(parentId) {
        const { data: children } = await supabase
          .from("groups")
          .select("id")
          .eq("parent_group_id", parentId);
        
        let allIds = [];
        if (children && children.length > 0) {
          for (const child of children) {
            allIds.push(child.id);
            const childSubgroups = await getSubgroupIds(child.id);
            allIds = allIds.concat(childSubgroups);
          }
        }
        return allIds;
      }

      const subgroupIds = await getSubgroupIds(groupId);
      const allGroupIds = [parseInt(groupId), ...subgroupIds];

      const { error: memberError } = await supabase
        .from("group_members")
        .delete()
        .in("group_id", allGroupIds);

      if (memberError) {
        console.warn("Error deleting group members:", memberError);
      }

      for (const subId of subgroupIds.reverse()) {
        await supabase.from("groups").delete().eq("id", subId);
      }

      const { error: deleteError } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (deleteError) {
        console.error("Delete group error:", deleteError);
        addLog("ERROR", "Groups", "Failed to delete group", deleteError.message);
        return res.status(500).json({ error: "Failed to delete group" });
      }

      addLog("INFO", "Groups", `Deleted group ${groupId} and ${subgroupIds.length} subgroups`);
      res.json({ message: "Group deleted successfully", deletedGroups: allGroupIds.length });
    } catch (error) {
      console.error("Delete group error:", error);
      addLog("ERROR", "Groups", "Server error deleting group", error.message);
      res.status(500).json({ error: "Failed to delete group" });
    }
  };

  return {
    getAllGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup
  };
};

module.exports = { createGroupController };
