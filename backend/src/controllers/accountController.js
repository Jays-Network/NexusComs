const createAccountController = (supabase, addLog) => {
  
  const getAllAccounts = async (req, res) => {
    try {
      const { data: accounts, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Fetch accounts error:", error);
        return res.status(500).json({ error: "Failed to fetch accounts" });
      }

      const accountMap = {};
      const rootAccounts = [];

      (accounts || []).forEach(account => {
        accountMap[account.id] = { ...account, children: [] };
      });

      (accounts || []).forEach(account => {
        if (account.parent_account_id && accountMap[account.parent_account_id]) {
          accountMap[account.parent_account_id].children.push(accountMap[account.id]);
        } else {
          rootAccounts.push(accountMap[account.id]);
        }
      });

      res.json({ accounts: accounts || [], tree: rootAccounts });
    } catch (error) {
      console.error("Fetch accounts error:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  };

  const getAccountById = async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", id)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const { data: users } = await supabase
        .from("users")
        .select("id, username, email, billing_plan")
        .eq("account_id", id);

      const { data: channelAssignments } = await supabase
        .from("account_channels")
        .select("*")
        .eq("account_id", id);

      const { data: childAccounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("parent_account_id", id);

      res.json({
        ...account,
        users: users || [],
        channels: channelAssignments || [],
        childAccounts: childAccounts || []
      });
    } catch (error) {
      console.error("Fetch account error:", error);
      res.status(500).json({ error: "Failed to fetch account" });
    }
  };

  const createAccount = async (req, res) => {
    try {
      const { name, description, parent_account_id, billing_plan } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Account name is required" });
      }

      if (parent_account_id) {
        const { data: parentAccount } = await supabase
          .from("accounts")
          .select("id")
          .eq("id", parent_account_id)
          .single();

        if (!parentAccount) {
          return res.status(400).json({ error: "Parent account not found" });
        }
      }

      const { data: account, error } = await supabase
        .from("accounts")
        .insert({
          name,
          description: description || null,
          parent_account_id: parent_account_id || null,
          billing_plan: billing_plan || 'basic',
          created_by: req.user.userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Create account error:", error);
        return res.status(500).json({ error: "Failed to create account" });
      }

      addLog("INFO", "Accounts", `Account created: ${name}`);
      res.status(201).json(account);
    } catch (error) {
      console.error("Create account error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  };

  const updateAccount = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, parent_account_id, billing_plan } = req.body;

      if (parent_account_id === parseInt(id)) {
        return res.status(400).json({ error: "Account cannot be its own parent" });
      }

      if (parent_account_id) {
        const { data: descendants } = await supabase
          .from("accounts")
          .select("id, parent_account_id");
        
        const isDescendant = (checkId, targetId, accounts) => {
          const account = accounts.find(a => a.id === checkId);
          if (!account) return false;
          if (account.parent_account_id === targetId) return true;
          if (account.parent_account_id) {
            return isDescendant(account.parent_account_id, targetId, accounts);
          }
          return false;
        };

        if (isDescendant(parent_account_id, parseInt(id), descendants || [])) {
          return res.status(400).json({ error: "Cannot create circular hierarchy" });
        }
      }

      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (parent_account_id !== undefined) updateData.parent_account_id = parent_account_id;
      if (billing_plan !== undefined) updateData.billing_plan = billing_plan;

      const { data: account, error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Update account error:", error);
        return res.status(500).json({ error: "Failed to update account" });
      }

      addLog("INFO", "Accounts", `Account updated: ${account.name}`);
      res.json(account);
    } catch (error) {
      console.error("Update account error:", error);
      res.status(500).json({ error: "Failed to update account" });
    }
  };

  const deleteAccount = async (req, res) => {
    try {
      const { id } = req.params;

      const { data: children } = await supabase
        .from("accounts")
        .select("id")
        .eq("parent_account_id", id);

      if (children && children.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete account with child accounts. Delete or reassign children first." 
        });
      }

      await supabase
        .from("users")
        .update({ account_id: null })
        .eq("account_id", id);

      await supabase
        .from("account_channels")
        .delete()
        .eq("account_id", id);

      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Delete account error:", error);
        return res.status(500).json({ error: "Failed to delete account" });
      }

      addLog("INFO", "Accounts", `Account deleted: ${id}`);
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  };

  const assignUsers = async (req, res) => {
    try {
      const { id } = req.params;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ error: "userIds array is required" });
      }

      const { error } = await supabase
        .from("users")
        .update({ account_id: parseInt(id) })
        .in("id", userIds);

      if (error) {
        console.error("Assign users error:", error);
        return res.status(500).json({ error: "Failed to assign users" });
      }

      addLog("INFO", "Accounts", `Assigned ${userIds.length} users to account ${id}`);
      res.json({ message: "Users assigned successfully" });
    } catch (error) {
      console.error("Assign users error:", error);
      res.status(500).json({ error: "Failed to assign users" });
    }
  };

  const removeUser = async (req, res) => {
    try {
      const { id, userId } = req.params;

      const { error } = await supabase
        .from("users")
        .update({ account_id: null })
        .eq("id", userId)
        .eq("account_id", id);

      if (error) {
        console.error("Remove user error:", error);
        return res.status(500).json({ error: "Failed to remove user" });
      }

      addLog("INFO", "Accounts", `Removed user ${userId} from account ${id}`);
      res.json({ message: "User removed from account" });
    } catch (error) {
      console.error("Remove user error:", error);
      res.status(500).json({ error: "Failed to remove user" });
    }
  };

  return {
    getAllAccounts,
    getAccountById,
    createAccount,
    updateAccount,
    deleteAccount,
    assignUsers,
    removeUser
  };
};

module.exports = { createAccountController };
