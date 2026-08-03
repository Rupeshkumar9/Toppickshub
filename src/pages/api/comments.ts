import type { APIRoute } from 'astro';
import { ObjectId, type Document, type Filter, type WithId } from 'mongodb';
import { z } from 'zod';
import { checkRateLimit, getClientIp, internalError, isSameOrigin, json, pageIdSchema, readJson } from '../../lib/api';
import { getDatabase } from '../../lib/mongodb';

export const prerender = false;

const createCommentSchema = z.object({
  pageId: pageIdSchema,
  author: z.string().trim().min(1).max(60),
  content: z.string().trim().min(1).max(2_000),
  parentId: z.string().trim().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  website: z.string().max(0).optional(),
}).strict();

type CommentDocument = {
  pageId: string;
  author: string;
  content: string;
  parentId: ObjectId | null;
  likes: number;
  flagCount: number;
  status: 'approved' | 'pending' | 'flagged';
  createdAt: Date;
  updatedAt: Date;
};

function serializeComment(comment: WithId<CommentDocument>) {
  return {
    id: comment._id.toHexString(),
    pageId: comment.pageId,
    author: comment.author,
    content: comment.content,
    parentId: comment.parentId?.toHexString() ?? null,
    likes: comment.likes || 0,
    createdAt: comment.createdAt.toISOString(),
  };
}

function encodeCursor(comment: WithId<CommentDocument>) {
  return Buffer.from(JSON.stringify({
    date: comment.createdAt.toISOString(),
    id: comment._id.toHexString(),
  })).toString('base64url');
}

function decodeCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!parsed.date || !ObjectId.isValid(parsed.id)) return null;
    const date = new Date(parsed.date);
    if (Number.isNaN(date.getTime())) return null;
    return { date, id: new ObjectId(parsed.id) };
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ url }) => {
  const pageIdResult = pageIdSchema.safeParse(url.searchParams.get('pageId'));
  if (!pageIdResult.success) return json({ error: 'A valid pageId is required.' }, { status: 400 });

  const sort = url.searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 5, 1), 20);
  const cursorValue = url.searchParams.get('cursor');
  const cursor = cursorValue ? decodeCursor(cursorValue) : null;
  if (cursorValue && !cursor) return json({ error: 'The pagination cursor is invalid.' }, { status: 400 });

  try {
    const database = await getDatabase();
    const comments = database.collection<CommentDocument>('comments');
    const direction = sort === 'newest' ? -1 : 1;
    const filter: Filter<CommentDocument> = {
      pageId: pageIdResult.data,
      status: 'approved',
      parentId: null,
    };

    if (cursor) {
      const comparison = direction === -1 ? '$lt' : '$gt';
      (filter as Document).$or = [
        { createdAt: { [comparison]: cursor.date } },
        { createdAt: cursor.date, _id: { [comparison]: cursor.id } },
      ];
    }

    const topLevel = await comments
      .find(filter)
      .sort({ createdAt: direction, _id: direction })
      .limit(limit + 1)
      .toArray();

    const hasMore = topLevel.length > limit;
    const page = topLevel.slice(0, limit);
    const parentIds = page.map((comment) => comment._id);
    const replies = parentIds.length
      ? await comments.find({ parentId: { $in: parentIds }, status: 'approved' }).sort({ createdAt: 1 }).toArray()
      : [];

    const items = page.map((comment) => ({
      ...serializeComment(comment),
      replies: replies.filter((reply) => reply.parentId?.equals(comment._id)).map(serializeComment),
    }));
    const total = await comments.countDocuments({ pageId: pageIdResult.data, status: 'approved' });

    return json(
      {
        items,
        total,
        nextCursor: hasMore && page.length ? encodeCursor(page[page.length - 1]) : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' } },
    );
  } catch (error) {
    return internalError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });

  const rateLimit = checkRateLimit(`comment:${getClientIp(request)}`, 5, 10 * 60_000);
  if (!rateLimit.allowed) {
    return json(
      { error: 'Too many comments. Please wait before posting again.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  try {
    const parsed = createCommentSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: 'Please check the comment fields and try again.' }, { status: 400 });
    if (parsed.data.website) return json({ ok: true, status: 'pending' }, { status: 202 });

    const database = await getDatabase();
    const comments = database.collection<CommentDocument>('comments');
    let parentId: ObjectId | null = null;

    if (parsed.data.parentId) {
      parentId = new ObjectId(parsed.data.parentId);
      const parent = await comments.findOne({ _id: parentId, pageId: parsed.data.pageId, status: 'approved' });
      if (!parent || parent.parentId) return json({ error: 'The parent comment is invalid.' }, { status: 400 });
    }

    const now = new Date();
    const status: CommentDocument['status'] = import.meta.env.COMMENTS_REQUIRE_MODERATION === 'true'
      ? 'pending'
      : 'approved';
    const document = {
      pageId: parsed.data.pageId,
      author: parsed.data.author,
      content: parsed.data.content,
      parentId,
      likes: 0,
      flagCount: 0,
      status,
      createdAt: now,
      updatedAt: now,
    };
    const result = await comments.insertOne(document);
    const inserted = { ...document, _id: result.insertedId } as WithId<CommentDocument>;

    return json(
      { status, comment: status === 'approved' ? serializeComment(inserted) : null },
      { status: status === 'approved' ? 201 : 202, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.includes('Content-Type'))) {
      return json({ error: error.message }, { status: 400 });
    }
    return internalError(error);
  }
};
