export default function AuthShell({ title, hint, eyebrow = 'unStuck · Stuck at Question Three', callout, children, footer }) {
    return (
        <div className="mx-auto mt-0 max-w-md">
            <div className="margin-sheet rounded-md border border-rule border-t-4 border-t-marker bg-sheet px-6 py-8 shadow-[var(--ui-shadow)] sm:py-9 sm:pl-16 sm:pr-8">
                {eyebrow && (
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-pencil">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                <p className="mt-2 leading-relaxed text-graphite">{hint}</p>
                {callout && (
                    <div className="my-6 flex items-center gap-2 border-y border-rule py-3 text-xs text-graphite">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-verified" aria-hidden="true" />
                        {callout}
                    </div>
                )}
                <div className={callout ? 'mt-6' : 'mt-7'}>{children}</div>
            </div>
            <p className="mt-5 text-center text-sm text-graphite">{footer}</p>
        </div>
    );
}
