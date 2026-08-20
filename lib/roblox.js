const axios = require('axios');

const USERS_API = 'https://users.roblox.com/v1';
const THUMB_API = 'https://thumbnails.roblox.com/v1';
const FRIENDS_API = 'https://friends.roblox.com/v1';
const PRESENCE_API = 'https://presence.roblox.com/v1';

/**
 * Resolve a username to a userId.
 */
async function getUserIdByUsername(username) {
  const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
    usernames: [username],
    excludeBannedUsers: false,
  });
  const data = res.data && res.data.data;
  if (!data || data.length === 0) return null;
  return data[0];
}

/**
 * Roblox's /v1/users/{id} does NOT reliably return isBanned:true for
 * terminated accounts — it often 404s instead. We catch that here and
 * synthesize a minimal "banned" record so lookups don't just report
 * "user not found" for accounts that actually exist but were terminated.
 */
async function getUserInfo(userId) {
  try {
    const res = await axios.get(`${USERS_API}/users/${userId}`);
    return { ...res.data, isBanned: res.data.isBanned === true };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return {
        id: Number(userId),
        name: 'Unknown',
        displayName: 'Unknown',
        description: '',
        created: null,
        isBanned: true,
        terminated: true,
      };
    }
    throw err;
  }
}

async function getAvatarHeadshot(userId) {
  try {
    const res = await axios.get(`${THUMB_API}/users/avatar-headshot`, {
      params: {
        userIds: userId,
        size: '420x420',
        format: 'Png',
        isCircular: true);
    const item = res.data && res.data.data && res.data.data[0];
    return item ? item.imageUrl : null;
  } catch {
    return null;
  }
}

/**
 * Full-body avatar render (character standing full-figure), as opposed to
 * the cropped face/headshot above. Valid sizes: 30x30, 48x48, 60x60, 75x75,
 * 100x100, 110x110, 140x140, 150x150, 150x200, 180x180, 250x250, 352x352,
 * 420x420, 720x720.
 */
async function getAvatarFullBody(userId, size = '720x720') {
  try {
    const res = await axios.get(`${THUMB_API}/users/avatar`, {
      params: {
        userIds: userId,
        size,
        format: 'Png',
        isCircular: true,
      },
    });
    const item = res.data && res.data.data && res.data.data[0];
    return item ? item.imageUrl : null;
  } catch {
    return null;
  }
}

async function getFriendsCount(userId) {
  try {
    const res = await axios.get(`${FRIENDS_API}/users/${userId}/friends/count`);
    return res.data.count;
  } catch {
    return null;
  }
}

async function getFollowersCount(userId) {
  try {
    const res = await axios.get(`${FRIENDS_API}/users/${userId}/followers/count`);
    return res.data.count;
  } catch {
    return null;
  }
}

async function getFollowingCount(userId) {
  try {
    const res = await axios.get(`${FRIENDS_API}/users/${userId}/followings/count`);
    return res.data.count;
  } catch {
    return null;
  }
}

/**
 * Presence requires an authenticated request (.ROBLOSECURITY cookie).
 * Returns null gracefully if no cookie is configured.
 */
async function getPresence(userId, cookie) {
  if (!cookie) return null;
  try {
    const res = await axios.post(
      `${PRESENCE_API}/presence/users`,
      { userIds: [userId] },
      { headers: { Cookie: `.ROBLOSECURITY=${cookie}` } }
    );
    const p = res.data && res.data.userPresences && res.data.userPresences[0];
    return p || null;
  } catch {
    return null;
  }
}

const PRESENCE_LABEL = {
  0: 'Offline',
  1: 'Online',
  2: 'InGame',
  3: 'Studio',
};

/**
 * Full lookup used by the .roblox command.
 */
async function lookupUser(usernameOrId, cookie) {
  let userId = usernameOrId;
  if (!/^\d+$/.test(usernameOrId)) {
    userId = await getUserIdByUsername(usernameOrId);
    if (!userId) return null;
    userId = userId.id || userId;
  }

  const [info, headshot, fullBody, friends, followers, following, presence] = await Promise.all([
    getUserInfo(userId),
    getAvatarHeadshot(userId),
    getAvatarFullBody(userId),
    getFriendsCount(userId),
    getFollowersCount(userId),
    getFollowingCount(userId),
    getPresence(userId, cookie),
  ]);

  return {
    id: info.id,
    username: info.name,
    displayName: info.displayName,
    bio: info.description || '(no bio)',
    created: info.created,
    isBanned: info.isBanned,
    terminated: info.terminated === true,
    avatarUrl: fullBody || headshot,
    headshotUrl: headshot,
    fullBodyUrl: fullBody,
    friends,
    followers,
    following,
    presence: presence ? PRESENCE_LABEL[presence.userPresenceType] || 'Unknown' : 'Unknown (no auth cookie set)',
    profileUrl: `https://www.roblox.com/users/${info.id}/profile`,
  };
}

module.exports = {
  lookupUser,
  getUserIdByUsername,
  getUserInfo,
  getAvatarHeadshot,
  getAvatarFullBody,
};
