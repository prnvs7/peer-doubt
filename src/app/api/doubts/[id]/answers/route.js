import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import Answer from '@/models/Answer';
import { requireRole } from '@/lib/session';

const schema = z.object({ body: z.string().min(20, 'Write at least 20 characters').max(8000) });

export async function POST(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Not found' }, { status: 404 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    await connectDB();
    const doubt = await Doubt.findOneAndUpdate(
        { _id: id, status: 'CLAIMED', assignedHelper: session.user.id },
        { status: 'ANSWERED' }
    );
    if (!doubt) return Response.json({ msg: 'You need to take this doubt before answering it.' }, { status: 403 });

    const answer = await Answer.create({ doubt: id, helper: session.user.id, body: parsed.data.body });
    return Response.json(answer, { status: 201 });
}