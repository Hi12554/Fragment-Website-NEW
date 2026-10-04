import { createHmac, timingSafeEqual } from 'node:crypto';

const sessionCookieName = 'fragment_admin';
const sessionLifetimeSeconds = 8 * 60 * 60;

async function hasValidAdminSession(request, secret) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookie = cookieHeader
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith(`${sessionCookieName}=`));
    if (!cookie) return false;

    const token = cookie.slice(sessionCookieName.length + 1);
    const [expiry, signature, extra] = token.split('.');
    if (extra !== undefined || !/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature)) return false;

    const expiresAt = Number(expiry);
    const now = Date.now();
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt > now + sessionLifetimeSeconds * 1000 + 60_000) {
        return false;
    }

    const expectedSignature = createHmac('sha256', secret).update(expiry).digest();
    const providedSignature = Buffer.from(signature, 'hex');
    return timingSafeEqual(providedSignature, expectedSignature);
}

export default async function middleware(request) {
    if (process.env.MAINTENANCE_MODE === 'false') return;

    const { pathname } = new URL(request.url);
    if (pathname === '/maintenance' || pathname === '/Maintenance.html' || pathname === '/api/maintenance-auth') {
        return;
    }

    const secret = process.env.MAINTENANCE_ADMIN_SECRET;
    if (secret && await hasValidAdminSession(request, secret)) return;

    return new Response(null, {
        status: 302,
        headers: {
            Location: new URL('/maintenance', request.url).toString(),
            'Cache-Control': 'no-store'
        }
    });
}

export const config = {
    runtime: 'nodejs'
};
