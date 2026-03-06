import { hasWebPushConfig, getWebPushPublicKey } from '../../lib/webPush.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!hasWebPushConfig()) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }

    return res.status(200).json({
        publicKey: getWebPushPublicKey(),
    });
}
