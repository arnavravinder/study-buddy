const jwt = require('jsonwebtoken');
const CONFIG = {
  appId: 'vpaas-magic-cookie-06b712c66eaa43319db7f1d7ab130ca5',
  kid: process.env.JAAS_KEY_ID || 'YOUR_KEY_ID_HERE',
  privateKey: process.env.JAAS_PRIVATE_KEY || ''
};
function generateJWT(roomName, userName, isModerator = true) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    iat: now,
    exp: now + (2 * 60 * 60),
    nbf: now - 10,
    sub: CONFIG.appId,
    room: roomName || '*',
    context: {
      user: {
        id: `user-${Date.now()}`,
        name: userName || 'Student',
        email: `${userName}@studybuddy.app`,
        moderator: isModerator ? 'true' : 'false'
      },
      features: {
        recording: 'true',
        transcription: 'true',
        livestreaming: 'false',
        'outbound-call': 'false'
      }
    }
  };
  const token = jwt.sign(payload, CONFIG.privateKey, {
    algorithm: 'RS256',
    header: {
      kid: CONFIG.kid,
      typ: 'JWT',
      alg: 'RS256'
    }
  });
  return token;
}
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { roomName, userName, isModerator } = req.body;
    if (!CONFIG.privateKey) {
      return res.status(500).json({
        error: 'Private key not configured. Set JAAS_PRIVATE_KEY environment variable.'
      });
    }
    const token = generateJWT(roomName, userName, isModerator);
    res.json({
      success: true,
      token,
      roomName: roomName || 'any-room',
      expiresIn: '2 hours'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate token',
      details: error.message
    });
  }
};
