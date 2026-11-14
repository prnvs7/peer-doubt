import { Suspense } from 'react';
import KnowledgeDetail from '@/components/knowledge/KnowledgeDetail';
export const metadata = { title: 'Verified answer' };

async function KnowledgeContent({ params }) {
    const { id } = await params;
    return <KnowledgeDetail id={id} />;
}

export default function Page({ params }) {
    return <Suspense fallback={<div className="card mx-auto mt-8 h-96 max-w-4xl animate-pulse" aria-label="Loading knowledge entry" />}><KnowledgeContent params={params} /></Suspense>;
}
