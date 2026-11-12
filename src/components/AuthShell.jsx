export default function AuthShell({ title, hint, children, footer }) {
    return (
        <div className="mx-auto mt-8 max-w-md">
            <div className="margin-sheet rounded-md border border-rule py-9 pl-16 pr-8 shadow-sm">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-1 mb-6 text-graphite">{hint}</p>
                {children}
            </div>
            <p className="mt-4 text-center text-sm text-graphite">{footer}</p>
        </div>
    );
}