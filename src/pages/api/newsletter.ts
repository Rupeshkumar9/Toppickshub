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

    const senderApiToken = import.meta.env.SENDER_API_TOKEN;
    const senderGroupId = import.meta.env.SENDER_GROUP_ID;
    if (!senderApiToken || !senderGroupId) {
      throw new Error('Sender API credentials are not configured.');
    }

    const response = await fetch('https://api.sender.net/v2/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${senderApiToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: payload.data.email,
        groups: [senderGroupId],
        trigger_automation: true,
      }),
    });

    if (!response.ok) {
      const senderError = await response.json().catch(() => null);
      console.error('Sender subscription failed.', {
        status: response.status,
        message: senderError?.message,
        errors: senderError?.errors,
      });
      if (response.status === 429) {
        return json({ error: 'The newsletter service is busy. Please try again shortly.' }, { status: 503 });
      }
      throw new Error(`Sender returned ${response.status}.`);
    }

    return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('Content-Type'))) {
      return json({ error: error.message }, { status: 400 });
    }
    return internalError(error);
  }
};
