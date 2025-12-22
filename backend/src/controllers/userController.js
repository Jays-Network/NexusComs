const bcrypt = require("bcrypt");

const createUserController = (supabase, addLog) => {
  
  const getAllUsers = async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, username, account_name, billing_plan, permissions, location_tracking, last_device, last_login, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  };

  const getTrackedUsers = async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, email, location_tracking, last_device, updated_at")
        .eq("location_tracking", true)
        .order("updated_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching tracked users:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!users || users.length === 0) {
        return res.json([]);
      }

      const userIds = users.map(u => u.id);
      const { data: locations, error: locError } = await supabase
        .from("user_locations")
        .select("user_id, latitude, longitude, accuracy, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (locError) {
        console.error("Error fetching user locations:", locError);
        return res.json(users);
      }

      const latestLocationByUser = {};
      for (const loc of locations || []) {
        if (!latestLocationByUser[loc.user_id]) {
          latestLocationByUser[loc.user_id] = loc;
        }
      }

      const usersWithLocation = users.map(user => {
        const location = latestLocationByUser[user.id];
        return {
          ...user,
          last_latitude: location?.latitude || null,
          last_longitude: location?.longitude || null,
          last_location_update: location?.created_at || null
        };
      });

      res.json(usersWithLocation);
    } catch (error) {
      console.error("Error fetching tracked users:", error);
      res.status(500).json({ error: "Failed to fetch tracked users" });
    }
  };

  const updateLocationTracking = async (req, res) => {
    try {
      const { id } = req.params;
      const { enabled } = req.body;

      const isAdmin = req.user.role === 'admin' || 
                      req.user.permissions?.can_access_cms === true ||
                      req.user.permissions?.admin === true ||
                      req.user.billing_plan === 'executive';
      if (req.user.id !== id && !isAdmin) {
        return res.status(403).json({ error: "Not authorized to update this user's settings" });
      }

      const { data, error } = await supabase
        .from("users")
        .update({ 
          location_tracking: enabled === true,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error updating location tracking:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`[Location Tracking] Updated for user ${id}: ${enabled}`);
      res.json({ success: true, location_tracking: enabled });
    } catch (error) {
      console.error("Error updating location tracking:", error);
      res.status(500).json({ error: "Failed to update location tracking" });
    }
  };

  const getUserById = async (req, res) => {
    try {
      const userId = req.params.id;
      console.log(`[GET /api/users/:id] Fetching user: ${userId}`);
      
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error(`[GET /api/users/:id] Supabase error for ID ${userId}:`, error);
        return res.status(404).json({ error: "User not found", details: error.message });
      }

      if (!data) {
        console.error(`[GET /api/users/:id] No data returned for ID ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`[GET /api/users/:id] User found: ${data.email}`);
      res.json(data);
    } catch (error) {
      console.error("[GET /api/users/:id] Exception:", error);
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  };

  const createUser = async (req, res) => {
    try {
      const { email, username, account_name, billing_plan, permissions } = req.body;

      if (!email || !username) {
        return res.status(400).json({ error: "Email and username required" });
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const password_hash = await bcrypt.hash(tempPassword, 10);

      let account_id = null;
      if (account_name) {
        const { data: matchingAccount } = await supabase
          .from("accounts")
          .select("id")
          .ilike("name", account_name)
          .single();
        if (matchingAccount) {
          account_id = matchingAccount.id;
        }
      }

      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            email,
            username,
            password_hash,
            creator_id: req.user.id,
            account_name: account_name || "",
            account_id: account_id,
            billing_plan: billing_plan || "basic",
            location_tracking: false,
            last_device: null,
            permissions: permissions || {
              can_create_groups: false,
              can_change_password: true,
              can_access_cms: false,
              is_enabled: true,
              can_edit_profile: false,
            },
          },
        ])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({
        user: data[0],
        tempPassword,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  };

  const updateUser = async (req, res) => {
    try {
      const { username, account_name, billing_plan, permissions, location_tracking, password } = req.body;

      const updateData = {};
      if (username) updateData.username = username;
      if (account_name !== undefined) {
        updateData.account_name = account_name;
        if (account_name) {
          const { data: matchingAccount } = await supabase
            .from("accounts")
            .select("id")
            .ilike("name", account_name)
            .single();
          if (matchingAccount) {
            updateData.account_id = matchingAccount.id;
          }
        } else {
          updateData.account_id = null;
        }
      }
      if (billing_plan) updateData.billing_plan = billing_plan;
      if (permissions) updateData.permissions = permissions;
      if (location_tracking !== undefined) updateData.location_tracking = location_tracking;
      
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.password_hash = hashedPassword;
      }
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", req.params.id)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json(data[0]);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  };

  const deleteUser = async (req, res) => {
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", req.params.id);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  };

  return {
    getAllUsers,
    getTrackedUsers,
    updateLocationTracking,
    getUserById,
    createUser,
    updateUser,
    deleteUser
  };
};

module.exports = { createUserController };
