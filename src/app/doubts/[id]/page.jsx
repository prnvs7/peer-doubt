import { notFound } from 'next/navigation';
import Link from 'next/link';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import Answer from '@/models/Answer';
import StatusTimeline from '@/components/StatusTimeline';
import StatusBadge from '@/components/StatusBadge';
import AnswerForm from '@/components/AnswerForm';
import AcceptButton from '@/components/AcceptButton';

export default async function DoubtDetail({ params }) {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) notFound();

    const session = await getServerSession(authOptions);
    await connectDB();
    const doubt = await Doubt.findById(id).populate('author', 'name').lean();
    if (!doubt) notFound();

    const answers = JSON.parse(
        JSON.stringify(await Answer.find({ doubt: id }).populate('helper', 'name').sort({ createdAt: 1 }).lean())
    );

    const isOwner = doubt.author._id.toString() === session.user.id;
    const isAssignedHelper = doubt.assignedHelper?.toString() === session.user.id;
    const authorName = doubt.isAnonymous && !isOwner ? 'Anonymous' : doubt.author.name;
    const date = new Date(doubt.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
    const inFlow = ['OPEN', 'CLAIMED', 'ANSWERED', 'VERIFIED'].includes(doubt.status);

    return (
        <div className="space-y-8">
            <Link href={isOwner ? '/doubts/mine' : '/helper'} className="text-sm text-graphite underline underline-offset-4 hover:text-ink">
                Back
            </Link>

            <article className="margin-sheet rounded-md border border-rule py-8 pl-14 pr-5 sm:pl-16 sm:pr-8">
                {inFlow ? <StatusTimeline status={doubt.status} /> : <StatusBadge status={doubt.status} />}
                <h1 className="mt-8 text-2xl font-semibold leading-snug tracking-tight">{doubt.title}</h1>
                <p className="mt-2 text-sm text-graphite">
                    {doubt.topic} in {doubt.course}. Asked by {authorName} on {date}.
                </p>
                <p className="mt-6 max-w-prose whitespace-pre-wrap font-serif text-[17px] leading-[1.75]">{doubt.description}</p>
            </article>

            <section aria-labelledby="answers-heading" className="space-y-5">
                <h2 id="answers-heading" className="text-lg font-semibold">
                    {answers.length > 0 ? `Answers (${answers.length})` : 'Answers'}
                </h2>

                {answers.length === 0 && !(isAssignedHelper && doubt.status === 'CLAIMED') && (
                    <p className="text-graphite">
                        {doubt.status === 'OPEN'
                            ? `No answers yet. Helpers who know ${doubt.topic} will see this in their feed.`
                            : 'A helper has taken this doubt and is working on an answer.'}
                    </p>
                )}

                {answers.map((a) => (
                    <div key={a._id} className="border-l-4 border-ink/80 bg-sheet py-4 pl-5 pr-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">{a.helper.name}</span>
                            {a.status === 'ACCEPTED' && (
                                <span className="text-verified">Accepted by the asker</span>
                            )}
                            {a.status === 'VERIFIED' && <StatusBadge status="VERIFIED" />}
                        </div>
                        <p className="mt-3 max-w-prose whitespace-pre-wrap font-serif text-[17px] leading-[1.75]">{a.body}</p>
                        {isOwner && a.status === 'SUBMITTED' && (
                            <div className="mt-4"><AcceptButton answerId={a._id} /></div>
                        )}
                    </div>
                ))}

                {isAssignedHelper && doubt.status === 'CLAIMED' && (
                    <div className="margin-sheet rounded-md border border-rule py-6 pl-14 pr-5 sm:pl-16 sm:pr-8">
                        <AnswerForm doubtId={id} />
                    </div>
                )}
            </section>
        </div>
    );
}