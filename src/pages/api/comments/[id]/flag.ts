import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { checkRateLimit, getClientIp, internalError, isSameOrigin, json } from '../../../../lib/api';
import { getDatabase } from '../../../../lib/mongodb';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  if (!params.id || !ObjectId.isValid(params.id)) return json({ error: 'Invalid comment id.' }, { status: 400 });

  const rateLimit = checkRateLimit(`flag:${getClientIp(request)}`, 10, 60 * 60_000);
  if (!rateLimit.allowed) {
    return json({ error: 'Too many reports.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } });
  }

  try {
    const comments = (await getDatabase()).collection('comments');
    const result = await comments.updateOne(
      { _id: new ObjectId(params.id), status: 'approved' },
      { $inc: { flagCount: 1 }, $set: { updatedAt: new Date() } },
    );
    if (!result.matchedCount) return json({ error: 'Comment not found.' }, { status: 404 });
    return json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return internalError(error);
  }
};
