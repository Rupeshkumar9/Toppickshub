import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { checkRateLimit, getClientIp, internalError, isSameOrigin, json, readJson } from '../../../../lib/api';
import { getDatabase } from '../../../../lib/mongodb';

export const prerender = false;

const payloadSchema = z.object({ liked: z.boolean() }).strict();

export const POST: APIRoute = async ({ params, request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  if (!params.id || !ObjectId.isValid(params.id)) return json({ error: 'Invalid comment id.' }, { status: 400 });

  const rateLimit = checkRateLimit(`like:${getClientIp(request)}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return json({ error: 'Too many requests.' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } });
  }

  try {
    const payload = payloadSchema.safeParse(await readJson(request));
    if (!payload.success) return json({ error: 'Invalid like request.' }, { status: 400 });

    const comments = (await getDatabase()).collection('comments');
    const filter = payload.data.liked
      ? { _id: new ObjectId(params.id), status: 'approved' }
      : { _id: new ObjectId(params.id), status: 'approved', likes: { $gt: 0 } };
    const updated = await comments.findOneAndUpdate(
      filter,
      { $inc: { likes: payload.data.liked ? 1 : -1 }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after', projection: { likes: 1 } },
    );

    if (!updated) return json({ error: 'Comment not found.' }, { status: 404 });
    return json({ likes: updated.likes || 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return internalError(error);
  }
};
