const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    const { channelName, uid } = req.body || req.query;
    if (!channelName || !uid) {
        return res.status(500).json({ error: 'channelName is required' });
    }
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    if (!appID || !appCertificate) {
        console.error('Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }
    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            appID,
            appCertificate,
            channelName,
            uid,
            role,
            privilegeExpiredTs
        );
        return res.status(200).json({ token, appID });
    } catch (error) {
        console.error('Error generating token:', error);
        return res.status(500).json({ error: 'Error generating token' });
    }
};
