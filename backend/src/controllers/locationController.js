const createLocationController = (supabase, addLog) => {
  
  const updateLocation = async (req, res) => {
    try {
      const { latitude, longitude, accuracy, timestamp, device_info } = req.body;
      // Support both route param (:id) and body (user_id) for flexibility
      const user_id = req.params.id || req.body.user_id;

      console.log(`[Location] Received location update request from user ${user_id}`);
      console.log(`[Location] Coordinates: ${latitude}, ${longitude}`);
      console.log(`[Location] Device: ${device_info || 'unknown'}`);

      if (req.user.id !== user_id) {
        console.log(`[Location] Auth mismatch: req.user.id=${req.user.id} !== user_id=${user_id}`);
        return res.status(403).json({ error: "Not authorized to update this user's location" });
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("location_tracking")
        .eq("id", user_id)
        .single();

      if (userError) {
        console.log(`[Location] Error checking user tracking status:`, userError);
      }

      const trackingEnabled = userData?.location_tracking !== false;
      
      if (!trackingEnabled) {
        console.log(`[Location] Tracking disabled for user ${user_id}`);
        return res.status(403).json({ error: "Location tracking is disabled" });
      }

      const { data, error } = await supabase
        .from("user_locations")
        .insert({
          user_id,
          latitude,
          longitude,
          accuracy,
          timestamp,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("[Location] Error inserting location:", error);
        return res.status(500).json({ error: error.message });
      }

      // Always update user's last known location
      const userUpdateData = {
        last_latitude: latitude,
        last_longitude: longitude,
        last_location_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Only include device_info if provided
      if (device_info) {
        userUpdateData.device_info = device_info;
      }
      
      await supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", user_id);

      console.log(`[Location] Successfully updated location for user ${user_id}`);
      res.json({ message: "Location updated", location: data });
    } catch (error) {
      console.error("[Location] Error updating user location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  };

  const getGroupLocations = async (req, res) => {
    try {
      const { groupId } = req.params;

      const { data: members, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId);

      if (membersError) {
        return res.status(500).json({ error: membersError.message });
      }

      if (!members || members.length === 0) {
        return res.json([]);
      }

      const memberIds = members.map(m => m.user_id);

      const { data: locations, error: locError } = await supabase
        .from("user_locations")
        .select(`
          id,
          user_id,
          latitude,
          longitude,
          accuracy,
          created_at,
          users!inner(id, display_name, avatar_url)
        `)
        .in("user_id", memberIds)
        .order("created_at", { ascending: false });

      if (locError) {
        console.error("Error fetching locations:", locError);
        return res.status(500).json({ error: locError.message });
      }

      const latestLocations = [];
      const seenUsers = new Set();
      for (const loc of locations || []) {
        if (!seenUsers.has(loc.user_id)) {
          seenUsers.add(loc.user_id);
          latestLocations.push({
            ...loc,
            user: loc.users
          });
        }
      }

      res.json(latestLocations);
    } catch (error) {
      console.error("Error fetching group locations:", error);
      res.status(500).json({ error: "Failed to fetch group locations" });
    }
  };

  return {
    updateLocation,
    getGroupLocations
  };
};

module.exports = { createLocationController };
