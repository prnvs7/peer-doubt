export default function AuthShell({ title, hint, eyebrow, callout, children, footer }) {
    return (
        <div className="mx-auto mt-0 max-w-md">
            <div className="margin-sheet rounded-md border border-rule border-t-4 border-t-marker bg-sheet py-9 pl-16 pr-8 shadow-lg shadow-ink/10">
                {eyebrow && (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-pencil">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-1 text-graphite">{hint}</p>
                {callout && (
                    <div className="my-6 flex items-center gap-2 border-y border-rule py-3 text-xs text-graphite">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-verified" aria-hidden="true" />
                        {callout}
                    </div>
                )}
                <div className={callout ? '' : 'mt-6'}>{children}</div>
            </div>
            <p className="mt-4 text-center text-sm text-graphite">{footer}</p>
        </div>
    );
}
