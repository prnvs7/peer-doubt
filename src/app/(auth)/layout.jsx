export default function Layout({ children }) {
    return (
        <div className="auth-stage relative isolate flex min-h-[calc(100vh-3.5rem)] items-center overflow-hidden px-5 py-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 h-64 w-64 rounded-full bg-marker/30 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-pencil/15 blur-3xl" />
            <div className="relative mx-auto max-w-5xl">{children}</div>
        </div>
    );
}
