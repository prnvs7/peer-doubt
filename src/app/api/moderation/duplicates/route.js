import connectDB from '@/lib/db';
import { getDuplicateSuggestions } from '@/lib/duplicate-suggestions';
import { parsePagination } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

export async function GET(req) {
    const { error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();

    const { page, limit } = parsePagination(new URL(req.url).searchParams);
    const suggestions = await getDuplicateSuggestions();
    return Response.json({
        items: suggestions.slice((page - 1) * limit, page * limit),
        pagination: { page, limit, total: suggestions.length, pages: Math.ceil(suggestions.length / limit) },
    });
}
