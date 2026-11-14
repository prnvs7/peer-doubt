import mongoose from 'mongoose';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import StatusTimeline from '@/components/StatusTimeLine';
import StatusBadge from '@/components/StatusBadge';
import AnswerForm from '@/components/AnswerForm';
import AcceptButton from '@/components/AcceptButton';
import QuestionRating from '@/components/QuestionRating';
import ReportButton from '@/components/ReportButton';
import EditDoubtForm from '@/components/EditDoubtForm';
import AnswerFeedback from '@/components/AnswerFeedback';
import User from '@/models/User';

async function DoubtDetailContent({ params }) {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) notFound();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');
    await connectDB();

    const doubt = await Doubt.findById(id).populate('author', 'name').populate('duplicateOf', 'title course topic status').lean();
    if (!doubt) notFound();
    const viewer = await User.findById(session.user.id).select('roles').lean();
    const canSeeFlagged = viewer?.roles?.some((role) => ['cr', 'faculty', 'admin'].includes(role));
    const answers = await Answer.find({ doubt: doubt._id })
        .populate('helper', 'name')
        .populate('moderationHistory.moderator', 'name')
        .populate('revisions.editedBy', 'name')
        .sort({ createdAt: 1 })
        .lean();

    const isOwner = doubt.author?._id?.toString() === session.user.id;
    const isAssignedHelper = doubt.assignedHelper?.toString() === session.user.id;
    const authorName = doubt.isAnonymous && !isOwner ? 'Anonymous' : (doubt.author?.name || 'Student');
    const currentRating = doubt.ratings?.find((entry) => entry.user.toString() === session.user.id)?.value || 0;
    const ratingAvailable = ['ANSWERED', 'VERIFIED'].includes(doubt.status);
    const inFlow = ['OPEN', 'CLAIMED', 'ANSWERED', 'VERIFIED'].includes(doubt.status);
    const date = new Date(doubt.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <div className="space-y-8">
            <Link href={isOwner ? '/doubts/mine' : '/helper'} className="text-sm text-graphite underline underline-offset-4 hover:text-ink">
                Back
            </Link>

            <article className="margin-sheet rounded-md border border-rule py-8 pl-14 pr-5 sm:pl-16 sm:pr-8">
                {inFlow ? <StatusTimeline status={doubt.status} /> : <StatusBadge status={doubt.status} />}
                {doubt.flaggedForReview && !canSeeFlagged ? <div className="mt-5 rounded-lg border border-margin/30 bg-margin/10 p-4 text-sm text-margin">This question is temporarily hidden while the moderation team reviews a report.</div> : <>
                <h1 className="mt-8 text-2xl font-semibold leading-snug tracking-tight">{doubt.title}</h1>
                <p className="mt-2 text-sm text-graphite">
                    {doubt.topic} in {doubt.course}. Asked by {authorName} on {date}.
                </p>
                <p className="mt-6 max-w-prose whitespace-pre-wrap font-serif text-[17px] leading-[1.75]">{doubt.description}</p>
                </>}
                {doubt.status === 'DUPLICATE' && doubt.duplicateOf && <div className="mt-5 rounded-xl bg-marker/40 p-4 text-sm"><p>This question was marked as a duplicate.</p><Link href={`/doubts/${doubt.duplicateOf._id}`} className="mt-1 inline-block font-semibold text-pencil hover:underline">Open original: {doubt.duplicateOf.title}</Link><p className="mt-1 text-xs text-graphite">{doubt.duplicateOf.course} / {doubt.duplicateOf.topic}</p></div>}
                {doubt.tags?.length > 0 && (
                    <ul aria-label="Question tags" className="mt-4 flex flex-wrap gap-2">
                        {doubt.tags.map((tag) => (
                            <li key={tag} className="rounded-full bg-marker px-3 py-1 text-xs font-medium text-ink">{tag}</li>
                        ))}
                    </ul>
                )}
                <div className="mt-6 space-y-3 border-t border-rule pt-4">
                    {isOwner && doubt.status === 'OPEN' && <EditDoubtForm doubt={{
                        id: doubt._id.toString(),
                        title: doubt.title,
                        description: doubt.description,
                        course: doubt.course,
                        topic: doubt.topic,
                        isAnonymous: doubt.isAnonymous,
                    }} />}
                    <QuestionRating
                        doubtId={doubt._id.toString()}
                        average={doubt.ratingAverage || 0}
                        count={doubt.ratingCount || 0}
                        currentRating={currentRating}
                        canRate={!isOwner && ratingAvailable}
                        disabledReason={isOwner
                            ? 'Authors cannot rate their own questions.'
                            : 'Ratings are available after a helper submits an answer.'}
                    />
                    <ReportButton targetType="doubt" targetId={doubt._id.toString()} />
                </div>
            </article>

            <section aria-labelledby="answers-heading" className="space-y-5">
                <div>
                    <h2 id="answers-heading" className="text-lg font-semibold">
                        {answers.length > 0 ? `Answers (${answers.length})` : 'Answers'}
                    </h2>
                    <p className="mt-1 text-sm text-graphite">
                        Peer answers are reviewed by a CR or faculty member before entering the knowledge library.
                    </p>
                </div>

                {answers.length === 0 && !(isAssignedHelper && doubt.status === 'CLAIMED') && (
                    <p className="text-graphite">
                        {doubt.status === 'OPEN'
                            ? `No answers yet. Helpers who know ${doubt.topic} will see this in their feed.`
                            : 'A helper has taken this doubt and is working on an answer.'}
                    </p>
                )}

                {answers.map((answer) => {
                    const content = answer.content || answer.body || '';
                    const decision = answer.moderationHistory?.find((entry) => entry.action === answer.status)
                        || [...(answer.moderationHistory || [])].reverse().find((entry) => ['REVISION_REQUESTED', 'RECONSIDERED'].includes(entry.action));
                    const canAccept = isOwner && ['PENDING', 'SUBMITTED', 'PENDING_REVIEW'].includes(answer.status);

                    return (
                        <article key={answer._id.toString()} id={`answer-${answer._id}`} className="border-l-4 border-ink/80 bg-sheet py-4 pl-5 pr-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                <span className="font-medium">{answer.helper?.name || 'Peer helper'}</span>
                                <StatusBadge status={answer.status} />
                            </div>
                            {decision && (
                                <p className="mt-2 text-xs text-graphite">
                                    {answer.status === 'VERIFIED' ? 'Verified' : 'Reviewed'} by {decision.moderator?.name || 'Moderator'}
                                    {decision.createdAt ? ` · ${new Date(decision.createdAt).toLocaleDateString()}` : ''}
                                </p>
                            )}
                            {answer.flaggedForReview && !canSeeFlagged ? <p className="mt-3 rounded-lg bg-margin/10 p-3 text-sm text-margin">This answer is temporarily hidden while the moderation team reviews a report.</p> : <p className="mt-3 max-w-prose whitespace-pre-wrap font-serif text-[17px] leading-[1.75]">{content}</p>}
                            {decision?.reason && (
                                <p className="mt-3 rounded-lg bg-paper p-3 text-sm text-graphite">Moderator note: {decision.reason}</p>
                            )}
                            {answer.status === 'VERIFIED' && <AnswerFeedback answerId={answer._id.toString()} />}
                            {answer.revisions?.length > 0 && <details className="mt-3 text-xs text-graphite"><summary className="cursor-pointer font-semibold">Revision history ({answer.revisions.length})</summary><ol className="mt-2 space-y-2">{answer.revisions.map((revision, index) => <li key={`${answer._id}-${index}`}><p>{revision.editedBy?.name || 'Helper'} edited on {new Date(revision.createdAt).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap rounded bg-paper p-2">{revision.content}</p></li>)}</ol></details>}
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                {canAccept && <AcceptButton answerId={answer._id.toString()} />}
                                <ReportButton targetType="answer" targetId={answer._id.toString()} />
                            </div>
                        </article>
                    );
                })}

                {isAssignedHelper && doubt.status === 'CLAIMED' && (
                    <div className="margin-sheet rounded-md border border-rule py-6 pl-14 pr-5 sm:pl-16 sm:pr-8">
                        <AnswerForm doubtId={id} />
                    </div>
                )}
            </section>
        </div>
    );
}

export default function DoubtDetailPage({ params }) {
    return (
        <Suspense fallback={<div className="card mx-auto max-w-4xl animate-pulse p-8" aria-label="Loading doubt"><div className="h-5 w-28 rounded bg-paper" /><div className="mt-5 h-9 max-w-xl rounded bg-paper" /><div className="mt-4 h-24 rounded bg-paper" /></div>}>
            <DoubtDetailContent params={params} />
        </Suspense>
    );
}
