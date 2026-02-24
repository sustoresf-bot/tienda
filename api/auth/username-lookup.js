export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Deprecated by design: avoids account enumeration (email/uid disclosure via username).
    return res.status(410).json({ error: 'Username login deprecated. Use email login.' });
}
