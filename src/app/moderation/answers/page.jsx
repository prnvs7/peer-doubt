import AnswerQueue from '@/components/moderation/AnswerQueue';
export const metadata = { title: 'Answer review' };
export default async function Page({ searchParams }) {
    const params = await searchParams;
    const value = (key) => typeof params?.[key] === 'string' ? params[key] : '';
    return <AnswerQueue initialStatus={value('status')} initialPage={value('page')} initialFilters={{ q: value('q'), course: value('course'), topic: value('topic'), from: value('from'), to: value('to') }} />;
}
