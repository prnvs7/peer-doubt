import KnowledgeBrowser from '@/components/knowledge/KnowledgeBrowser';
export const metadata = { title: 'Knowledge library' };
export default async function Page({ searchParams }) {
    const params = await searchParams;
    const value = (key) => typeof params?.[key] === 'string' ? params[key] : '';
    return <KnowledgeBrowser initialFilters={{ q: value('q'), course: value('course'), topic: value('topic') }} initialSort={value('sort') || 'newest'} initialPage={value('page')} />;
}
