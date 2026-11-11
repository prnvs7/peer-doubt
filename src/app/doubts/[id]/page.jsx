import { notFound } from 'next/navigation';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import StatusTimeline from '@/components/StatusTimeline';

export default async function DoubtDetail({ params }) {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) notFound();

    const session = await getServerSession(authOptions);
    await connectDB();
    const doubt = await Doubt.findById(id).populate('author', 'name').lean();
    if (!doubt) notFound();

    const isOwner = doubt.author._id.toString() === session.user.id;
    const authorName = doubt.isAnonymous && !isOwner ? 'Anonymous' : doubt.author.name;

    return (
        <article className="bg-white border rounded p-5 space-y-4">
            <StatusTimeline status={doubt.status} />
            <h1 className="text-2xl font-semibold">{doubt.title}</h1>
            <p className="text-sm text-gray-500">
                {doubt.course} · {doubt.topic} · asked by {authorName} on{' '}
                {new Date(doubt.createdAt).toLocaleDateString()}
            </p>
            <p className="whitespace-pre-wrap">{doubt.description}</p>

            <hr />
            <p className="text-gray-500 text-sm">
                {doubt.status === 'OPEN'
                    ? 'Waiting for a helper to pick this up.'
                    : 'Answers will appear here (added in Module 2).'}
            </p>
        </article>
    );
}