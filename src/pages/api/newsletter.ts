import type { APIRoute } from 'astro';
import { z } from 'zod';
import { checkRateLimit, getClientIp, internalError, isSameOrigin, json, readJson } from '../../lib/api';

export const prerender = false;

const subscriptionSchema = z.object({
  email: z.email().trim().max(254),
  website: z.string().max(0).optional(),
}).strict();

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });

  const rateLimit = checkRateLimit(`newsletter:${getClientIp(request)}`, 5, 60 * 60_000);
  if (!rateLimit.allowed) {
    return json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  try {
    const payload = subscriptionSchema.safeParse(await readJson(request));
    if (!payload.success) return json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (payload.data.website) return json({ ok: true });

    const mailerLiteUrl = import.meta.env.MAILERLITE_FORM_URL;
    if (!mailerLiteUrl) throw new Error('MAILERLITE_FORM_URL is not configured.');

    const formData = new FormData();
    formData.append('fields[email]', payload.data.email);
    const response = await fetch(mailerLiteUrl, { method: 'POST', body: formData, redirect: 'follow' });
    if (!response.ok) throw new Error(`MailerLite returned ${response.status}.`);

    return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('Content-Type'))) {
      return json({ error: error.message }, { status: 400 });
    }
    return internalError(error);
  }
};
