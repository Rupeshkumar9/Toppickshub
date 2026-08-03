import { z } from 'zod';

type RateLimitEntry = { count: number; resetAt: number };

const globalRateLimits = globalThis as typeof globalThis & {
  topPicksHubRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits = globalRateLimits.topPicksHubRateLimits ?? new Map<string, RateLimitEntry>();
globalRateLimits.topPicksHubRateLimits = rateLimits;

export const pageIdSchema = z.string().trim().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (origin && origin !== new URL(request.url).origin) return false;
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  return true;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function readJson(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json.');
  }
  return request.json();
}

export function internalError(error: unknown) {
  console.error(error);
  return json(
    { error: 'The service is temporarily unavailable. Please try again.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
