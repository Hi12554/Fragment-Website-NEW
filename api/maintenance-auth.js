const { createHash, createHmac, timingSafeEqual } = require('node:crypto');

const sessionCookieName = 'fragment_admin';
const sessionLifetimeSeconds = 8 * 60 * 60;

module.exports = async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store');

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed.' });
    }

    const origin = request.headers.origin;
    const host = request.headers.host;
    if (!origin || !host) {
        return response.status(403).json({ error: 'Request origin is not allowed.' });
    }

    try {
        if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
            return response.status(403).json({ error: 'Request origin is not allowed.' });
        }
    } catch {
        return response.status(403).json({ error: 'Request origin is not allowed.' });
    }

    if (process.env.MAINTENANCE_MODE === 'false') {
        return response.status(404).json({ error: 'Maintenance mode is disabled.' });
    }

    const secret = process.env.MAINTENANCE_ADMIN_SECRET;
    if (typeof secret !== 'string' || secret.length < 32) {
        console.error('Maintenance admin access requires MAINTENANCE_ADMIN_SECRET to contain at least 32 characters.');
        return response.status(503).json({ error: 'Admin access is not configured. Please contact the site administrator.' });
    }

    let body = request.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return response.status(400).json({ error: 'Invalid request body.' });
        }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return response.status(400).json({ error: 'Invalid request body.' });
    }

    if (body.action === 'logout') {
        response.setHeader(
            'Set-Cookie',
            `${sessionCookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
        );
        return response.status(200).json({ ok: true });
    }

    if (typeof body.password !== 'string' || body.password.length > 1024) {
        return response.status(400).json({ error: 'Enter the admin password.' });
    }

    const providedHash = createHash('sha256').update(body.password).digest();
    const expectedHash = createHash('sha256').update(secret).digest();
    if (!timingSafeEqual(providedHash, expectedHash)) {
        return response.status(401).json({ error: 'Incorrect admin password.' });
    }

    const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
    const signature = createHmac('sha256', secret).update(String(expiresAt)).digest('hex');
    response.setHeader(
        'Set-Cookie',
        `${sessionCookieName}=${expiresAt}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionLifetimeSeconds}`
    );
    return response.status(200).json({ ok: true });
};
