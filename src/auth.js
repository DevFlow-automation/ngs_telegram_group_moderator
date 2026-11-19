import crypto from 'node:crypto';

export const SUPER_MODERATOR_ID = 8297487103;

function getSigningSecret() {
    return process.env.ADMIN_SECRET || process.env.BOT_TOKEN || 'ngs-olympiad-local-secret';
}

export function getAdminPassword() {
    return process.env.ADMIN_PASSWORD || 'ngs2026';
}

export function isUsingDefaultAdminPassword() {
    return !process.env.ADMIN_PASSWORD;
}

export function verifyTelegramInitData(initDataRaw) {
    if (!initDataRaw || !process.env.BOT_TOKEN) return null;
    try {
        const params = new URLSearchParams(initDataRaw);
        const hash = params.get('hash');
        if (!hash) return null;

        const pairs = [];
        for (const [key, value] of params.entries()) {
            if (key === 'hash') continue;
            pairs.push(`${key}=${value}`);
        }
        pairs.sort();
        const dataCheckString = pairs.join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();

        const computed = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        const hashBuf = Buffer.from(hash, 'hex');
        const computedBuf = Buffer.from(computed, 'hex');
        if (hashBuf.length !== computedBuf.length) return null;
        if (!crypto.timingSafeEqual(hashBuf, computedBuf)) return null;

        const authDate = Number(params.get('auth_date') || 0);
        const nowSec = Math.floor(Date.now() / 1000);
        if (authDate && nowSec - authDate > 86400 * 7) {
            return null;
        }

        const userStr = params.get('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const startParam = params.get('start_param') || null;

        return { user, startParam, authDate };
    } catch {
        return null;
    }
}

export function isTelegramAdminUser(tgUser) {
    if (!tgUser?.id) return false;
    const id = Number(tgUser.id);
    if (id === SUPER_MODERATOR_ID) return true;
    if (process.env.ADMIN_ID && String(id) === String(process.env.ADMIN_ID)) return true;
    return false;
}

export function createAdminToken(actor = { role: 'admin', name: 'Администратор' }) {
    const payload = {
        ...actor,
        iat: Date.now(),
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
        .createHmac('sha256', getSigningSecret())
        .update(encoded)
        .digest('base64url');
    return `${encoded}.${sig}`;
}

export function verifyAdminToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expected = crypto
        .createHmac('sha256', getSigningSecret())
        .update(encoded)
        .digest('base64url');

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
        if (!payload.exp || payload.exp < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

export function resolveRequestActor(req) {
    const initDataRaw = req.headers['x-telegram-init-data'] || '';
    const tgAuth = verifyTelegramInitData(Array.isArray(initDataRaw) ? initDataRaw[0] : initDataRaw);

    const authHeader = req.headers['authorization'] || '';
    const bearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    const urlObj = new URL(req.url || '/', 'http://localhost');
    const queryToken = urlObj.searchParams.get('token') || '';
    const tokenPayload = verifyAdminToken(bearer || queryToken);

    const tgUser = tgAuth?.user || null;
    const isAdmin = Boolean(tokenPayload) || isTelegramAdminUser(tgUser);

    return {
        tgUser,
        startParam: tgAuth?.startParam || null,
        isAdmin,
        adminActor: tokenPayload || (isTelegramAdminUser(tgUser)
            ? {
                role: 'telegram_admin',
                id: tgUser.id,
                name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Администратор'
            }
            : null)
    };
}
