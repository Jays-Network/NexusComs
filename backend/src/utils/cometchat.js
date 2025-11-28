const https = require('https');

const COMETCHAT_APP_ID = process.env.COMETCHAT_APP_ID;
const COMETCHAT_REGION = process.env.COMETCHAT_REGION || 'us';
const COMETCHAT_API_KEY = process.env.COMETCHAT_API_KEY;
const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;

const BASE_URL = `https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3`;

const isConfigured = () => {
  return !!(COMETCHAT_APP_ID && COMETCHAT_API_KEY && COMETCHAT_AUTH_KEY);
};

const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'appId': COMETCHAT_APP_ID,
        'apiKey': COMETCHAT_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            console.error(`[CometChat] API Error ${res.statusCode}:`, parsed);
            reject(new Error(parsed.error?.message || `API Error ${res.statusCode}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (e) => {
      console.error('[CometChat] Request error:', e.message);
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const sanitizeUid = (email) => {
  return email.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
};

const createUser = async (uid, name, avatar = null) => {
  console.log(`[CometChat] Creating user: ${uid}`);
  
  const userData = {
    uid: uid,
    name: name,
  };
  
  if (avatar) {
    userData.avatar = avatar;
  }

  try {
    const result = await makeRequest('POST', '/users', userData);
    console.log(`[CometChat] User created successfully: ${uid}`);
    return result;
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('ERR_UID_ALREADY_EXISTS')) {
      console.log(`[CometChat] User already exists: ${uid}, updating instead`);
      return await updateUser(uid, name, avatar);
    }
    throw error;
  }
};

const updateUser = async (uid, name, avatar = null) => {
  console.log(`[CometChat] Updating user: ${uid}`);
  
  const userData = {
    name: name,
  };
  
  if (avatar) {
    userData.avatar = avatar;
  }

  const result = await makeRequest('PUT', `/users/${uid}`, userData);
  console.log(`[CometChat] User updated successfully: ${uid}`);
  return result;
};

const getUser = async (uid) => {
  try {
    const result = await makeRequest('GET', `/users/${uid}`);
    return result.data;
  } catch (error) {
    if (error.message.includes('NOT_FOUND')) {
      return null;
    }
    throw error;
  }
};

const deleteUser = async (uid) => {
  console.log(`[CometChat] Deleting user: ${uid}`);
  await makeRequest('DELETE', `/users/${uid}`);
  console.log(`[CometChat] User deleted: ${uid}`);
};

const createAuthToken = async (uid) => {
  console.log(`[CometChat] Creating auth token for: ${uid}`);
  const result = await makeRequest('POST', `/users/${uid}/auth_tokens`);
  console.log(`[CometChat] Auth token created for: ${uid}`);
  return result.data.authToken;
};

const createGroup = async (guid, name, type = 'public', description = null, owner = null) => {
  console.log(`[CometChat] Creating group: ${guid}`);
  
  const groupData = {
    guid: guid,
    name: name,
    type: type,
  };
  
  if (description) {
    groupData.description = description;
  }
  
  if (owner) {
    groupData.owner = owner;
  }

  try {
    const result = await makeRequest('POST', '/groups', groupData);
    console.log(`[CometChat] Group created successfully: ${guid}`);
    return result;
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('ERR_GUID_ALREADY_EXISTS')) {
      console.log(`[CometChat] Group already exists: ${guid}`);
      return await getGroup(guid);
    }
    throw error;
  }
};

const getGroup = async (guid) => {
  try {
    const result = await makeRequest('GET', `/groups/${guid}`);
    return result.data;
  } catch (error) {
    if (error.message.includes('NOT_FOUND')) {
      return null;
    }
    throw error;
  }
};

const updateGroup = async (guid, name, description = null) => {
  console.log(`[CometChat] Updating group: ${guid}`);
  
  const groupData = {
    name: name,
  };
  
  if (description) {
    groupData.description = description;
  }

  const result = await makeRequest('PUT', `/groups/${guid}`, groupData);
  console.log(`[CometChat] Group updated successfully: ${guid}`);
  return result;
};

const deleteGroup = async (guid) => {
  console.log(`[CometChat] Deleting group: ${guid}`);
  await makeRequest('DELETE', `/groups/${guid}`);
  console.log(`[CometChat] Group deleted: ${guid}`);
};

const addGroupMembers = async (guid, members) => {
  console.log(`[CometChat] Adding members to group ${guid}:`, members);
  
  const memberData = {
    participants: members.map(uid => ({ uid })),
  };

  const result = await makeRequest('POST', `/groups/${guid}/members`, memberData);
  console.log(`[CometChat] Members added to group: ${guid}`);
  return result;
};

const removeGroupMember = async (guid, uid) => {
  console.log(`[CometChat] Removing member ${uid} from group ${guid}`);
  await makeRequest('DELETE', `/groups/${guid}/members/${uid}`);
  console.log(`[CometChat] Member removed from group: ${guid}`);
};

const getGroupMembers = async (guid) => {
  const result = await makeRequest('GET', `/groups/${guid}/members`);
  return result.data || [];
};

const sendMessage = async (receiverUid, messageText, receiverType = 'user', metadata = null) => {
  console.log(`[CometChat] Sending message to ${receiverType}: ${receiverUid}`);
  
  const messageData = {
    receiver: receiverUid,
    receiverType: receiverType,
    category: 'message',
    type: 'text',
    data: {
      text: messageText,
    },
  };
  
  if (metadata) {
    messageData.data.metadata = metadata;
  }

  const result = await makeRequest('POST', '/messages', messageData);
  console.log(`[CometChat] Message sent successfully`);
  return result;
};

const sendGroupMessage = async (guid, messageText, senderUid, metadata = null) => {
  console.log(`[CometChat] Sending group message to: ${guid}`);
  
  const messageData = {
    receiver: guid,
    receiverType: 'group',
    category: 'message',
    type: 'text',
    data: {
      text: messageText,
    },
  };
  
  if (metadata) {
    messageData.data.metadata = metadata;
  }

  const result = await makeRequest('POST', '/messages', messageData);
  console.log(`[CometChat] Group message sent successfully`);
  return result;
};

module.exports = {
  isConfigured,
  sanitizeUid,
  createUser,
  updateUser,
  getUser,
  deleteUser,
  createAuthToken,
  createGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  removeGroupMember,
  getGroupMembers,
  sendMessage,
  sendGroupMessage,
  COMETCHAT_APP_ID,
  COMETCHAT_REGION,
  COMETCHAT_AUTH_KEY,
};
