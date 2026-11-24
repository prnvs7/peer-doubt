# Module 3 Presentation Guide — Doubt Moderation and Knowledge Reuse

This guide follows the current code in peer-doubt/. Paths and line numbers refer to that project root. Short code excerpts are copied from the files; each excerpt stays under about 15 lines.

## Part 1 — Big picture

Module 3 makes helper answers safer to reuse. After a helper submits an explanation, a Course Representative (CR) reviews it first and either forwards it, rejects it, or flags the doubt as a duplicate. Faculty (and, by permission, administrators) make the final answer decision: they record a 1–5 review rating and written feedback, then verify, request an improvement, or reject. Verification publishes a KnowledgeEntry connected to the verified answer. Future students can search the library, and while they write a doubt the app can suggest a matching verified doubt. Mongoose is the library that maps JavaScript objects to MongoDB records; an ObjectId is MongoDB’s ID value; a transaction groups database writes so they commit or roll back together; an upsert updates a matching record or inserts one if none exists.

> **One-line connection to the other modules:** Module 1 supplies the Doubt and Module 2 supplies helper matching and the Helper answer; Module 3 reviews that answer and preserves verified explanations for reuse.

~~~mermaid
flowchart LR
    A[Doubt] --> B[Helper match and answer]
    B --> C[CR first review]
    C -->|Forward| D[Faculty or admin final review]
    C -->|Reject| X[Answer rejected]
    C -->|Duplicate| Y[Doubt linked to an earlier doubt]
    D -->|Needs improvement| B
    D -->|Reject| X
    D -->|Verify| E[KnowledgeEntry published]
    E --> F[Searchable Knowledge Library]
    E --> G[Similar verified doubt suggested while typing]
~~~

### Answer lifecycle in this code

| Answer status / decision | Who can move it | Route or action | Main side effects |
|---|---|---|---|
| No Answer → PENDING | Helper | POST /api/doubts/[id]/answers (handoff into Module 3) | Doubt moves CLAIMED → ANSWERED; Answer is created; asker and moderators are notified. |
| PENDING → FACULTY_PENDING | CR | PATCH /api/moderation/answers/[id]/forward, { decision: "FORWARD" } | Adds FORWARDED_TO_FACULTY to Answer history and a ModerationLog; clears a review assignment. It does not send a forward notification. |
| PENDING → REJECTED | CR | Same forward route, { decision: "REJECT", category, note } | Adds rejection history and a ModerationLog; sends the helper a notification. This CR path does not reopen the Doubt. |
| FACULTY_PENDING → VERIFIED | Faculty or admin | PATCH /api/moderation/answers/[id]/verify | Saves Answer decision history and reviewer; may award helper reputation; moves Doubt to VERIFIED; upserts KnowledgeEntry; writes ModerationLog; then attempts notifications to helper and asker. |
| FACULTY_PENDING → REVISION_REQUESTED | Faculty or admin | PATCH /api/moderation/answers/[id]/needs-improvement | Stores NEEDS_IMPROVEMENT action, rating, and feedback; writes ModerationLog; notifies helper. The Answer status is REVISION_REQUESTED, not NEEDS_IMPROVEMENT. |
| FACULTY_PENDING → REJECTED | Faculty or admin | PATCH /api/moderation/answers/[id]/reject | Stores rating, feedback, and reason; writes ModerationLog; if Doubt is still ANSWERED and assigned to that helper, reopens it to CLAIMED; notifies helper. |
| REVISION_REQUESTED → PENDING | The answer’s helper | PATCH /api/answers/[id] | Saves new content, stores previous text in revisions, and notifies moderators and asker. It returns to CR review. |
| REJECTED → REVISION_REQUESTED | Faculty or admin | PATCH /api/moderation/answers/[id]/reconsider | Reopens an eligible Doubt to ANSWERED, adds reconsideration history/log, and notifies helper. |
| Doubt → DUPLICATE (separate from Answer status) | CR, faculty, or admin in assigned course scope | PATCH /api/doubts/[id]/duplicate, { decision: "CONFIRM", originalDoubtId } | Sets duplicateOf, increments retained original’s duplicateLinkCount, writes a ModerationLog, and notifies candidate’s author. Answer status is not changed by this route. |

Answer also accepts legacy statuses SUBMITTED, PENDING_REVIEW, and ACCEPTED. ACCEPTED is not the same as VERIFIED. The normal faculty path requires FACULTY_PENDING; admins are an exception because the server allows them to act on legacy and PENDING answers too. The UI’s “Needs improvement” button writes REVISION_REQUESTED status. These details are likely viva questions.

## Part 2 — Module 3 file map

| File path | Type | What it does | Feature |
|---|---|---|---|
| src/app/moderation/layout.jsx | layout | Checks canModerate, redirects unauthenticated users to login and unauthorized users to access denied, and renders moderation navigation. | 1 |
| src/app/moderation/page.jsx | page | Renders moderation dashboard. | 1 |
| src/app/moderation/answers/page.jsx | page | Reads URL search params and passes initial filters/status to AnswerQueue. | 1 |
| src/app/moderation/duplicates/page.jsx | page | Renders moderator duplicate comparison queue. | 1, 2 |
| src/app/moderation/history/page.jsx | page | Renders searchable moderation history. | 1 |
| src/app/moderation/reports/page.jsx | page | Renders adjacent reported-content queue. | 1 (adjacent moderation) |
| src/components/moderation/AnswerQueue.jsx | component | Loads queue, shows role-specific actions, captures feedback/rating, calls review APIs. | 1, 2 |
| src/components/moderation/DuplicateQueue.jsx | component | Shows candidate/original pairs and lets a moderator confirm or dismiss a suggestion. | 1, 2 |
| src/components/moderation/ModerationDashboard.jsx | component | Shows scoped counts, recent activity, and links to review work. | 1, 3 |
| src/components/moderation/ModerationHistory.jsx | component | Filters and displays audit entries. | 1 |
| src/components/moderation/ModerationNav.jsx | component | Links among moderation desk pages. | 1 |
| src/components/moderation/ReportQueue.jsx | component | Reviews reported doubts and answers; adjacent to the answer flow. | 1 (adjacent moderation) |
| src/components/StatusBadge.jsx | component | Converts stored status values to labels and styles. | 1, 3 |
| src/app/doubts/new/page.jsx | page + client component | Contains the inline “Similar doubts already exist” panel and 500 ms search effect. There is no separate similar-doubts-panel file. | 2 |
| src/app/api/doubts/similar/route.js | API route | Returns up to five text-index matches among verified, unflagged Doubts. | 2 |
| src/lib/similarity.js | lib helper | Computes weighted word-overlap score for moderator duplicate suggestions. | 2 |
| src/lib/duplicate-suggestions.js | lib helper | Compares recent doubts in the same course/topic and drops dismissed pairs. | 2 |
| src/app/api/moderation/duplicates/route.js | API route | Applies moderator permission/scope and returns duplicate suggestions. | 1, 2 |
| src/app/api/doubts/[id]/duplicate/route.js | API route | Confirms or dismisses duplicate decision, records it, and notifies author. | 1, 2 |
| src/app/api/moderation/queue/route.js | API route | Returns scoped answer/report queues with search, status, date filters, pagination. | 1 |
| src/app/api/moderation/answers/[id]/forward/route.js | API route | CR forward/reject endpoint. | 1 |
| src/app/api/moderation/answers/[id]/verify/route.js | API route | Delegates final verification to moderateAnswer. | 1, 3 |
| src/app/api/moderation/answers/[id]/needs-improvement/route.js | API route | Delegates improvement request to moderateAnswer. | 1 |
| src/app/api/moderation/answers/[id]/reject/route.js | API route | Delegates faculty/admin rejection to moderateAnswer. | 1 |
| src/app/api/moderation/answers/[id]/revise/route.js | API route | Moderator send-back-for-correction route for pending answers. | 1 |
| src/app/api/moderation/answers/[id]/reconsider/route.js | API route | Faculty/admin reopens rejected answer for correction. | 1 |
| src/app/api/moderation/answers/[id]/assign/route.js | API route | PUT claims an available review; DELETE releases current user’s claim. | 1 |
| src/app/api/moderation/history/route.js | API route | Reads scoped ModerationLog records with filters. | 1 |
| src/app/api/moderation/stats/route.js | API route | Computes scoped dashboard totals, review time, duplicate count, knowledge distribution. | 1, 3 |
| src/app/api/doubts/[id]/answers/route.js | API route | Helper’s answer submission—the boundary into this module. | 1 (handoff) |
| src/app/api/answers/[id]/route.js | API route | Helper edits answer after REVISION_REQUESTED and returns it to PENDING. | 1 |
| src/app/knowledge/page.jsx | page | Reads search params and renders knowledge browser. | 3 |
| src/app/knowledge/[id]/page.jsx | dynamic page | Awaits entry ID and renders detail client component in a Suspense boundary. | 3 |
| src/app/knowledge/saved/page.jsx | page | Renders current user’s saved entries. | 3 |
| src/app/knowledge/layout.jsx | layout | Requires a signed-in active user for knowledge pages. | 3 |
| src/components/knowledge/KnowledgeBrowser.jsx | component | Debounces search, filters, sorts, paginates, and renders active knowledge. | 3 |
| src/components/knowledge/KnowledgeDetail.jsx | component | Loads entry, increments view count through detail API, displays related entries. | 3 |
| src/components/knowledge/SavedKnowledge.jsx | component | Loads a user’s bookmarks. | 3 |
| src/components/knowledge/KnowledgeSaveButton.jsx | component | Saves/removes a personal bookmark through PUT. | 3 |
| src/components/knowledge/ArchiveKnowledgeButton.jsx | component | Collects archive reason and calls archive API. | 3 |
| src/app/api/knowledge/route.js | API route | Searches active knowledge with text/course/topic filters and sort/pagination. | 3 |
| src/app/api/knowledge/[id]/route.js | API route | GET returns eligible entry; PATCH archives it for scoped faculty/admin. | 3 |
| src/app/api/knowledge/[id]/bookmark/route.js | API route | Saves/removes a valid bookmark for signed-in user. | 3 |
| src/app/api/knowledge/bookmarks/route.js | API route | Lists that user’s eligible saved entries. | 3 |
| src/components/NotificationCenter.jsx | component | Polls current user’s notifications and lets them mark them read. | 1 (side effect display) |
| src/app/notifications/page.jsx | page | Renders notification center. | 1 (side effect display) |
| src/app/api/notifications/route.js | API route | Lists signed-in user’s notifications; PATCH marks all read. | 1 (side effect display) |
| src/app/api/notifications/[id]/route.js | API route | Marks one owned notification read. | 1 (side effect display) |
| src/models/Answer.js | model | Answer content/status, reviewer metadata, decision history, revisions, assignment. | 1, 3 |
| src/models/Doubt.js | model | Question status/content, duplicate link, flags, ratings, text index. | 1, 2, 3 |
| src/models/KnowledgeEntry.js | model | Searchable, archivable verified-answer record. | 3 |
| src/models/ModerationLog.js | model | Audit record with idempotency key. | 1, 2, 3 |
| src/models/Notification.js | model | User-scoped review notifications with deduplication. | 1 |
| src/models/User.js | model | Roles, course scope, status, helper reputation. | 1 |
| src/models/KnowledgeBookmark.js | model | Unique user-to-entry bookmark relation. | 3 |
| src/models/AnswerFeedback.js | model | One helpful/not-helpful record per user/answer; related quality signal. | 3 |
| src/models/Report.js | model | Report queue record; adjacent moderation functionality. | 1 (adjacent moderation) |
| src/lib/answer-moderation.js | lib helper | Shared server validation/transaction for faculty/admin verify, reject, needs-improvement. | 1, 3 |
| src/lib/moderation.js | lib helper | Audit upsert, pagination parser, ObjectId validation. | 1, 2 |
| src/lib/notifications.js | lib helper | Deduplicates notification creation per recipient. | 1 |
| src/lib/session.js | lib helper | Resolves NextAuth session to current database user and checks role/permission. | 1, 2, 3 |
| src/lib/auth/roles.mjs | lib helper | Maps permissions to roles. | 1 |
| src/lib/auth/policy.mjs | lib helper | Returns 401/403/200 authorization decisions. | 1 |
| src/lib/auth/scope.mjs | lib helper | Builds course-scoped doubt, answer, report, and log filters. | 1, 2 |
| src/lib/auth/scope-policy.mjs | lib helper | Resolves CR assignments, faculty assignments/department, or admin-wide scope. | 1 |
| src/lib/db.js | lib helper | Validates Mongo config and caches a Mongoose connection/promise. | 1, 2, 3 |
| scripts/seed-faculty-cr.js | script | Upserts presentation users/demo questions/answers using demo keys; writes to database. | 1, 2, 3 |
| scripts/demo-reset.js | script | Deletes/resets marked demo records and restores staged statuses; do not run during presentation. | 1, 3 |
| scripts/verify-module3-persistence.mjs | script | Creates tagged records, tests persistence, then deletes them; not read-only. | 1, 3 |
| scripts/initialize-database.mjs | script | Creates missing collections/indexes; setup script, not a live demo action. | 1, 2, 3 |
| tests/similarity.test.mjs | test | Exercises scorer overlap/tag behavior. | 2 |
| tests/rbac.test.mjs, tests/rbac-routes.test.mjs | tests | Check role policy and route guard wiring. | 1 |

## Part 3 — Next.js concepts used in Module 3

### 1. App Router and file-based routes

**Definition:** In App Router, folders under src/app become URL segments and special files such as page.jsx, layout.jsx, and route.js have framework meaning.

**Where:** src/app/moderation/answers/page.jsx:1-7 renders AnswerQueue; src/app/knowledge/page.jsx:1-7 renders KnowledgeBrowser.

~~~jsx
// src/app/knowledge/page.jsx:3-7
export default async function Page({ searchParams }) {
    const params = await searchParams;
    const value = (key) => typeof params?.[key] === 'string' ? params[key] : '';
    return <KnowledgeBrowser initialFilters={{ q: value('q'), course: value('course'), topic: value('topic') }} initialSort={value('sort') || 'newest'} initialPage={value('page')} />;
}
~~~

**Why here:** The URL can represent page/filter state, while a layout can protect a whole section.

**Say aloud:** “The folder and special filename define the route, so /knowledge maps to the knowledge page.”

### 2. Dynamic routes and async params

**Definition:** A folder like [id] captures one URL segment as a parameter.

**Where:** src/app/knowledge/[id]/page.jsx:5-12 awaits params, then passes id to KnowledgeDetail; API files also use dynamic [id] folders.

~~~jsx
// src/app/knowledge/[id]/page.jsx:5-8
async function KnowledgeContent({ params }) {
    const { id } = await params;
    return <KnowledgeDetail id={id} />;
}
~~~

**Why here:** The same page/API implementation can load any knowledge entry or answer by ID. In this Next 16 project, params is awaited.

**Say aloud:** “The [id] segment is a placeholder, and the page awaits it before loading that record.”

### 3. Route Handlers and HTTP methods

**Definition:** A route.js file exports functions named after HTTP verbs to handle API requests.

**Where:** src/app/api/moderation/answers/[id]/verify/route.js:4-8 exports PATCH; most handlers return standard Response.json, not NextResponse.json.

~~~js
// src/app/api/moderation/answers/[id]/verify/route.js:4-8
async function handlePATCH(req, { params }) {
    return moderateAnswer(req, params, 'VERIFIED');
}
export const PATCH = withApiErrors(handlePATCH, { route: '/api/moderation/answers/[id]/verify', method: 'PATCH' });
~~~

**Why here:** The client sends structured data and receives JSON plus an HTTP status. Invalid input returns 400, no session 401, forbidden role/scope 403, missing record 404, and conflicting state 409.

**Say aloud:** “The browser sends PATCH to the matching route.js, which validates and returns JSON.”

### 4. Server Components and Client Components

**Definition:** App Router pages/layouts are Server Components by default; a Client Component opts into browser state, effects, and event handlers with the use client directive.

**Where:** src/app/moderation/answers/page.jsx is a server page; src/components/moderation/AnswerQueue.jsx:1-5 uses client state/effects/session.

~~~jsx
// src/components/moderation/AnswerQueue.jsx:1-5
'use client';
import { fetchWithTimeout } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
~~~

**Why here:** A moderator changes tabs, types feedback, selects stars, clicks actions, and refreshes queue data without a full page reload.

**Say aloud:** “The page starts on the server, then the interactive queue runs as a client component.”

### 5. Authentication and server session lookup

**Definition:** Authentication proves who signed in; a session carries that identity between requests.

**Where:** src/lib/auth.js:7-10 configures NextAuth credentials with JWT sessions; src/lib/session.js:8-20 calls getServerSession, loads the current User record, and checks current account state.

~~~js
// src/lib/session.js:8-18, excerpt
export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId || !validObjectId(userId)) return { session: null, user: null, error: 'Not logged in', status: 401 };
    try {
        await connectDB();
        const user = await User.findById(userId)
            .select('name email role roles status isSuspended isHelper courses availability helperProfile assignedCourses department')
            .lean();
        const decision = authorizeCurrentUser({ sessionUser: session.user, currentUser: user });
~~~

**Why here:** A stale role in a browser token is not trusted as the complete authorization source; the server checks the current database user.

**Say aloud:** “The signed session identifies the user, and the server rechecks their current account before allowing an action.”

### 6. Role-based access control and course scope

**Definition:** Role-based access control (RBAC) grants actions based on roles; course scope narrows which records an allowed role can see/change.

**Where:** src/lib/auth/roles.mjs:19-30 maps canForwardAnswer to CR and canVerifyAnswer to faculty/admin. src/lib/auth/scope-policy.mjs:10-20 gives admins all courses, faculty assigned courses or department, and CRs assigned courses.

~~~js
// src/lib/auth/roles.mjs:19-25
const PERMISSION_ROLES = Object.freeze({
    canModerate: [ROLES.ADMIN, ROLES.FACULTY, ROLES.CR],
    canVerifyAnswer: [ROLES.ADMIN, ROLES.FACULTY],
    canForwardAnswer: [ROLES.CR],
    canReviewReports: [ROLES.ADMIN, ROLES.FACULTY, ROLES.CR],
~~~

**Why here:** Hiding a button is not enough; the API checks permission and the database query is limited to the user’s courses. A student calling verify gets 403.

**Say aloud:** “The server checks both the role and the course, so changing the browser cannot grant review access.”

### 7. Client fetching, server queries, and caching

**Definition:** Client fetching runs from a browser component; server querying runs inside a route handler or server page. Caching stores a result for reuse.

**Where:** AnswerQueue fetches /api/moderation/queue; that handler connects to MongoDB and queries Answer. KnowledgeBrowser fetches /api/knowledge. These flows use polling/debounce but no explicit Next revalidate, revalidateTag, or unstable_cache.

~~~js
// src/components/moderation/AnswerQueue.jsx:35-40, excerpt
const json = await res.json();
if (!res.ok) throw new Error(json.msg || 'Could not load answers.');
setItems(json.items || []);
setPagination(json.pagination || { page, pages: 1, total: 0 });
~~~

**Why here:** Each moderator sees current, course-scoped records; pending queue polls every 7 seconds, and browser search waits briefly before querying.

**Say aloud:** “The interactive component asks our own API for current data; the API applies permissions and reads MongoDB.”

### 8. Environment variables and the database helper

**Definition:** Environment variables hold deployment configuration outside ordinary application code.

**Where:** src/lib/db.js:36-60 reads MONGODB_URI and optional MONGODB_DB; lines 22-28 cache the connection; lines 99-122 reuse a connection promise. Do not put .env.local values in a presentation or screenshot.

~~~js
// src/lib/db.js:82-89
export default async function connectDB() {
    applyDnsConfiguration();
    const { uri, dbName } = readMongoConfig();
    if (connectionCache.connection?.readyState === 1 && connectionCache.uri === uri)
        return connectionCache.connection;
    if (connectionCache.promise && connectionCache.uri === uri)
        return connectionCache.promise;
~~~

**Why here:** Next development can reload modules repeatedly; a global cache avoids opening duplicate Mongoose connections in that process. autoIndex is disabled in production, so deployment/setup must ensure indexes exist.

**Say aloud:** “The database URL stays in environment configuration, while connectDB reuses the active connection.”

### 9. Navigation and redirects

**Definition:** Link provides app navigation; useRouter navigates after a client action; redirect stops a server render and sends the browser elsewhere.

**Where:** src/app/moderation/layout.jsx:5-8 redirects based on requirePermission; src/app/doubts/new/page.jsx:54 pushes to the created doubt; queue and knowledge components use Link.

~~~jsx
// src/app/moderation/layout.jsx:5-8
export default async function ModerationLayout({ children }) {
    const { error, status } = await requirePermission('canModerate');
    if (error) redirect(status === 401 ? '/login' : '/access-denied');
~~~

**Why here:** Users get a clear page-level route while APIs still enforce authorization independently.

**Say aloud:** “The layout redirects before showing the moderation desk, and API routes repeat the check for safety.”

### 10. Metadata, loading, and error boundaries

**Definition:** Metadata sets a page title/description; loading.jsx and error.jsx provide route fallbacks.

**Where:** src/app/knowledge/page.jsx:2 exports a title; src/app/loading.jsx renders skeleton placeholders; moderation/knowledge error.jsx files use shared RouteError.

~~~jsx
// src/app/knowledge/page.jsx:1-3
import KnowledgeBrowser from '@/components/knowledge/KnowledgeBrowser';
export const metadata = { title: 'Knowledge library' };
export default async function Page({ searchParams }) {
~~~

**Why here:** A slow database request or route error has a visible loading/recovery state instead of a blank screen.

**Say aloud:** “Metadata labels the page, and route fallbacks show loading or recovery UI while data is unavailable.”

## Part 4 — React concepts used in Module 3

### 1. Components and props

**Definition:** A component is a reusable piece of UI; props are values passed into it.

**Where:** AnswerQueue receives initialStatus, initialPage, and initialFilters; StatusBadge receives a status; KnowledgeBrowser receives initial filters from its server page.

~~~jsx
// src/components/StatusBadge.jsx:18-19
export default function StatusBadge({ status }) {
    const s = MAP[status] ?? { label: 'Status unavailable', cls: 'bg-rule text-graphite' };
~~~

**Why here:** Queue logic, status labels, and knowledge cards stay in focused components.

**Say aloud:** “The page passes initial values as props, and smaller components render a single concern.”

### 2. useState and controlled fields

**Definition:** useState stores values that can change while a component is open; a controlled input reads its value from React state.

**Where:** AnswerQueue.jsx:16-27 stores items, page, status, filters, rejection notes, categories, ratings, busy, error, and success message. doubts/new/page.jsx:10-15 stores form fields and similar results.

~~~jsx
// src/app/doubts/new/page.jsx:10-15
const [form, setForm] = useState({
    title: '', description: '', course: '', topic: '', tags: '', isAnonymous: false,
});
const [similar, setSimilar] = useState([]);
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
~~~

**Why here:** React knows what the user selected and can render validation, loading, and result changes immediately.

**Say aloud:** “The field’s value comes from state, and its onChange writes the next value back to state.”

### 3. Effects and polling

**Definition:** useEffect synchronizes a component with an outside system such as a timer or network request.

**Where:** AnswerQueue.jsx:44-53 delays the initial queue load and polls only while Pending is selected; NotificationCenter.jsx:29-33 polls notifications every 45 seconds and clears its timers on unmount.

~~~jsx
// src/components/moderation/AnswerQueue.jsx:49-53
useEffect(() => {
    if (statusFilter !== 'PENDING') return undefined;
    const interval = setInterval(load, 7000);
    return () => clearInterval(interval);
}, [load, statusFilter]);
~~~

**Why here:** New moderation work can appear while the desk is open without a manual page reload.

**Say aloud:** “This effect starts a seven-second refresh only for the pending queue, then clears the timer on cleanup.”

### 4. Debounce for similar doubts

**Definition:** Debouncing waits until typing pauses before sending a request, reducing unnecessary requests.

**Where:** src/app/doubts/new/page.jsx:17-34 combines title and description, caps query at 250 characters, waits 500 ms, and cancels the timer when input changes.

~~~jsx
// src/app/doubts/new/page.jsx:20-25, excerpt
if (q.length < 3) return;
let cancelled = false;
const t = setTimeout(async () => {
    const params = new URLSearchParams({ q });
    if (form.course) params.set('course', form.course);
    if (form.topic) params.set('topic', form.topic);
~~~

Steps: (1) title/description/course/topic changes; (2) the input handler clears old suggestions; (3) if query has at least 3 characters, a 500 ms timer starts; (4) when it fires, React calls the similar API; (5) cleanup sets cancelled and clears the timer so an older request cannot replace newer results. The already-sent request is not aborted; only its state update is ignored.

**Why here:** A student can see suggestions while typing without querying MongoDB on every keystroke.

**Say aloud:** “The half-second pause is the debounce; cleanup cancels the old timer and prevents stale results from updating the screen.”

### 5. Form handling and validation

**Definition:** A controlled form keeps field values in state and handles submit/change events in JavaScript.

**Where:** The new doubt form uses value/onChange and onSubmit; the moderation card requires rating and written faculty feedback. Server Zod schemas validate again.

~~~jsx
// src/components/moderation/AnswerQueue.jsx:76-82
if (!isCr && action !== 'reject' && reason.length < 3) {
    setError('Add written feedback before saving this faculty review.');
    return;
}
if (!isCr && action !== 'reconsider' && !ratings[answer._id]) {
    setError('Choose a 1–5 star rating before saving this faculty review.');
~~~

**Why here:** The UI gives quick feedback, while server validation protects the database if someone bypasses the UI.

**Say aloud:** “The form checks input in React for convenience, and the API repeats important checks for correctness.”

### 6. Conditional rendering

**Definition:** Conditional rendering chooses which JSX to show based on state or props.

**Where:** AnswerQueue.jsx:257-265 shows CR actions for a CR-only session and faculty actions otherwise; it also has loading, error, empty, and populated queue states.

~~~jsx
// src/components/moderation/AnswerQueue.jsx:257-265
{isCr ? <>
    <button type="button" className="btn-quiet text-margin" onClick={() => review(answer, 'reject')} disabled={!!busy}>Reject</button>
    <button type="button" className="btn-quiet" onClick={() => markDuplicate(answer)} disabled={!!busy}>Mark duplicate</button>
    <button type="button" className="btn-primary" onClick={() => review(answer, 'forward')} disabled={!!busy}>Approve &amp; forward to faculty</button>
</> : <>
    <button type="button" className="btn-quiet text-margin" onClick={() => review(answer, 'reject')} disabled={!!busy}>Reject</button>
    <button type="button" className="btn-quiet" onClick={() => review(answer, 'needs-improvement')} disabled={!!busy}>Needs improvement</button>
    <button type="button" className="btn-primary" onClick={() => review(answer, 'verify')} disabled={!!busy}>Verify</button>
</>}
~~~

**Why here:** The same queue can present different workflows depending on the user’s roles.

**Say aloud:** “The component selects actions from the session roles, while the API independently enforces those roles.”

### 7. Lists and keys

**Definition:** React renders a list by mapping data to elements; a key gives each element a stable identity.

**Where:** New-doubt suggestions use similar.map with key={d._id}; queue and knowledge cards use answer/entry IDs.

~~~jsx
// src/app/doubts/new/page.jsx:94-95
{similar.map((d) => (
    <li key={d._id}>
~~~

**Why here:** Stable keys help React update the correct card when results change.

**Say aloud:** “Each database ID is the key, so React can track the correct item when a list changes.”

### 8. Async actions and error feedback

**Definition:** An async handler waits for a request; try/catch/finally handles errors and resets loading state.

**Where:** AnswerQueue.review() parses JSON, shows inline success/error messages, reloads the list, and clears the busy flag. These are inline alerts/status messages, not toast popups.

~~~jsx
// src/components/moderation/AnswerQueue.jsx:107-116, excerpt
const json = await res.json();
if (!res.ok) throw new Error(json.msg || 'Could not save this decision.');
await load();
} catch (err) { setError(err.message); }
finally { setBusy(''); }
~~~

**Why here:** The moderator sees whether the save worked, and the queue refreshes from server truth.

**Say aloud:** “After the request, the UI reports success or failure and reloads the authoritative queue.”

## Part 5 — The three features, step by step

### Feature 1 — Moderation

#### A. CR forwards an answer

1. **UI:** A CR opens /moderation/answers. The page renders AnswerQueue; the component sees the cr role and loads the Pending tab.
2. **React handler:** Clicking **Approve & forward to faculty** calls review(answer, 'forward') in src/components/moderation/AnswerQueue.jsx:64-117.
3. **Fetch:** It sends PATCH /api/moderation/answers/{id}/forward with { decision: 'FORWARD' } (AnswerQueue.jsx:87-94). No CR feedback is required to forward.
4. **Route and permission:** forward/route.js:30-39 calls requirePermission('canForwardAnswer'), awaits dynamic id, validates it, and validates JSON. canForwardAnswer is CR-only (src/lib/auth/roles.mjs:19-25).
5. **Scope and record read:** Inside a Mongo transaction, getModerationAnswerFilter() restricts the answer to the CR’s assigned courses; the route accepts pending/legacy statuses and prevents a helper from moderating their own answer (forward/route.js:44-53).
6. **Database changes:** A conditional update changes Answer to FACULTY_PENDING, clears review assignment fields, and appends FORWARDED_TO_FACULTY to moderationHistory (forward/route.js:55-74). It creates a ModerationLog carrying an idempotency key in the same transaction (forward/route.js:76-88).
7. **Response/UI:** The route returns { ok: true, status }. AnswerQueue shows a success message and reloads the queue (AnswerQueue.jsx:107-115). The forward route does not send a notification.

#### B. Faculty verifies an answer

1. **UI:** Faculty opens Pending. The API maps faculty Pending to FACULTY_PENDING and enforces course scope. They choose 1–5 stars, enter feedback, and click **Verify** (AnswerQueue.jsx:239-250, 261-265).
2. **React handler/fetch:** review(answer, 'verify') sends PATCH /api/moderation/answers/{id}/verify with { rating, feedback } (AnswerQueue.jsx:76-105). The UI requires feedback of at least 3 characters and a rating.
3. **Route/permission:** verify/route.js calls moderateAnswer(..., 'VERIFIED'). moderateAnswer() requires canVerifyAnswer (faculty/admin), validates ID/body with Zod, and loads the scoped Answer and its Doubt (src/lib/answer-moderation.js:39-74). A student gets 403; invalid ID gets 404; invalid review input gets 400.
4. **Guards:** The server blocks self-review, another moderator’s active assignment, and answers not yet at FACULTY_PENDING for regular faculty (answer-moderation.js:75-89). Admin may act on legacy and PENDING statuses. The update filter uses old status so concurrent review cannot silently overwrite another decision.
5. **Transaction — first:** Answer becomes VERIFIED; verifiedBy, verifiedAt, and moderationHistory item are written (answer-moderation.js:91-120). That history item includes faculty rating and feedback.
6. **Transaction — helper reputation:** On a real status transition, helper reputation increments by 10. Demo answers are protected from duplicate awards by demoReputationAwarded (answer-moderation.js:93-125).
7. **Transaction — Doubt status:** If Doubt is not already verified, its status changes from OPEN, CLAIMED, or ANSWERED to VERIFIED; if no eligible row matches, transaction fails (answer-moderation.js:127-136).
8. **Transaction — KnowledgeEntry:** findOneAndUpdate({ answer }, { $setOnInsert: … }, { upsert: true }) creates one entry per answer, copying doubt title/course/topic/description/tags and answer content (answer-moderation.js:137-159). KnowledgeEntry.answer is unique (src/models/KnowledgeEntry.js:5).
9. **Transaction — audit:** recordModerationAction() upserts a ModerationLog using answer:{id}:verified as idempotency key (answer-moderation.js:168-182, src/lib/moderation.js:17-35). A retry does not create duplicate audit rows.
10. **After transaction — notifications:** notifyUsers() attempts an ANSWER_VERIFIED notification for helper and asker (answer-moderation.js:194-212). Each recipient gets a dedupe key (src/lib/notifications.js:3-15). Notification failure is logged but does not undo verification.
11. **Response/UI:** Endpoint returns { ok: true, status: 'VERIFIED', knowledgePublished: true }; UI shows confirmation and reloads queue. Entry can now appear in Knowledge Library.

**Important distinction:** Faculty rating is stored in Answer.moderationHistory; it is not the same as the asker’s question rating stored on Doubt.ratings. Knowledge cards show the doubt’s rating aggregate, not the faculty review rating.

#### C. Reject and duplicate actions

- A CR’s **Reject** button uses the forward route with required category/note. It rejects Answer and notifies helper. It does not move Doubt back to CLAIMED in this CR-specific route.
- Faculty/admin rejection uses /reject; it requires rating/feedback, logs the decision, notifies helper, and attempts to reopen Doubt to CLAIMED when its current status/helper match.
- **Mark duplicate** changes Doubt, not Answer. From AnswerQueue, the UI first calls /api/doubts/similar and uses the first other result as original (AnswerQueue.jsx:119-143); the duplicate PATCH then links it. The separate Duplicate doubts page lets a moderator compare a pair and choose Confirm or Dismiss.

### Feature 2 — Repeated-question identification

1. **UI event:** On /doubts/new, a change to title, description, course, or topic updates controlled form state. The handler clears old suggestions (src/app/doubts/new/page.jsx:62-66, 73-88).
2. **Debounce:** The effect combines title and description, trims it, limits it to 250 characters, requires 3 characters, and waits 500 ms (new/page.jsx:17-34).
3. **Fetch:** It calls GET /api/doubts/similar?q=…&course=…&topic=…. It updates the panel only if the response is OK and not stale.
4. **Permission/input validation:** similar/route.js:7-18 requires a signed-in active user, validates course/topic against COURSES, and returns an empty array for a query shorter than 3 characters.
5. **Mongo query:** Doubt has a MongoDB text index over title and description (src/models/Doubt.js:46). The route uses $text: { $search: q }, requires status VERIFIED, excludes flagged doubts, adds exact course/topic filters when supplied, sorts by MongoDB textScore, and limits to five (similar/route.js:20-31). This is lexical text search; it is not regex and does not call an AI/embedding service.
6. **UI result:** Inline panel shows each title/status and links to /doubts/{id} in a new tab (new/page.jsx:90-102). It is advisory: submit handler does not block a repeated question.
7. **No manual reindex per question:** MongoDB maintains an existing text index as documents are written. The app does not rebuild the index for each search. connectDB turns autoIndex off in production, so deployment/database initialization must ensure the declared index exists.

There is a second, different duplicate feature for moderators. getDuplicateSuggestions() loads the newest 240 in-scope doubts except DUPLICATE/REJECTED, compares only pairs with the same course/topic, and keeps scores of 28 or more (src/lib/duplicate-suggestions.js:5-28). compareDoubts() lowercases/normalizes words, removes punctuation/common stop words, then calculates Jaccard overlap (shared tokens divided by union of tokens): title × 0.62, description × 0.20, same course × 0.10, same topic × 0.08, tags × 0.10, capped at 100 (src/lib/similarity.js:7-37). This moderator queue is **not limited to verified Doubts**; the Verified-only rule applies to student typing suggestions.

### Feature 3 — Knowledge Repository

1. **Creation:** A successful faculty/admin verify action upserts a KnowledgeEntry by answer in the same transaction as Answer and Doubt status update.
2. **Schema:** Entry stores answer, doubt, verifiedBy, verifiedAt, title/course/topic, question text, answer content, tags, helpful/view counts, ACTIVE/ARCHIVED status, and archive metadata (src/models/KnowledgeEntry.js:3-24). Unique answer prevents more than one entry per Answer.
3. **Search UI:** /knowledge renders KnowledgeBrowser; controls collect query/course/topic/sort and debounce API call (KnowledgeBrowser.jsx:18-36). A query sets relevance sort by default.
4. **Search API:** GET /api/knowledge?q=&course=&topic=&sort=&page= requires signed-in user; it filters to active or legacy status-missing entries; $text searches title/question/answerContent/topic (index at KnowledgeEntry.js:31); course/topic are exact filters. Sort choices are relevance, newest verified, helpful count, or view count (src/app/api/knowledge/route.js:15-27).
5. **Eligibility (“trusted”):** Aggregation joins entry to Answer and requires Answer.status === VERIFIED and not flagged. It joins Doubt and excludes flagged, DUPLICATE, and REJECTED doubts (knowledge/route.js:28-38). Detail GET repeats the verified-answer check. The visible Verified badge is backed by server checks and saved verifier/time.
6. **Display and reuse:** Cards show title, answer excerpt, helper, verifier, course/topic, and Doubt’s student rating. Detail GET increments viewCount. Bookmarking uses a separate unique user/entry record.
7. **Archiving:** Faculty/admin with course scope can archive an entry with a reason. The entry becomes ARCHIVED and an audit record is written; Answer/history remain stored. Rejected/pending answers do not pass the search aggregation’s verified-answer lookup.

## Part 6 — Important code lines cheat sheet

| File:line | Code | Plain meaning |
|---|---|---|
| src/lib/auth/roles.mjs:21 | canVerifyAnswer: [ROLES.ADMIN, ROLES.FACULTY] | Faculty/admin have final verify permission. |
| src/lib/auth/roles.mjs:22 | canForwardAnswer: [ROLES.CR] | Only CR can use the forward action. |
| src/app/api/moderation/answers/[id]/forward/route.js:31 | requirePermission('canForwardAnswer') | Server enforces CR permission. |
| src/lib/auth/scope.mjs:26 | return { _id: answerId, ...(doubtIds === null ? {} : { doubt: { $in: doubtIds } }) }; | Adds course scope to answer lookup. |
| src/app/api/moderation/queue/route.js:38-44 | Role-specific PENDING status map | CR sees initial pending; faculty sees FACULTY_PENDING; admin sees both. |
| src/app/api/moderation/answers/[id]/forward/route.js:62-70 | $set: { status: 'FACULTY_PENDING' } | Forwarding changes status and appends history. |
| src/lib/answer-moderation.js:59-61 | action === 'NEEDS_IMPROVEMENT' ? 'REVISION_REQUESTED' : action | Action label differs from stored status name. |
| src/lib/answer-moderation.js:69-76 | Scoped load + self-review guard | A helper cannot moderate their own answer. |
| src/lib/answer-moderation.js:96-120 | Conditional findOneAndUpdate | Saves review only if answer is still in expected state. |
| src/lib/answer-moderation.js:123-124 | $inc: { 'helperProfile.reputation': 10 } | Verified live answers award helper reputation once per transition. |
| src/lib/answer-moderation.js:130 | status: { $in: ['OPEN', 'CLAIMED', 'ANSWERED'] } | Limits the Doubt transition to expected states. |
| src/lib/answer-moderation.js:138 | await KnowledgeEntry.findOneAndUpdate( | Begins the one-entry-per-answer upsert. |
| src/lib/moderation.js:17-19 | return ModerationLog.findOneAndUpdate({ idempotencyKey }, | Retry-safe audit write uses its unique key. |
| src/lib/notifications.js:10 | `return Notification.updateOne(` | The following update uses `$setOnInsert` and `{ upsert: true }` to deduplicate each recipient’s notification key. |
| src/models/Doubt.js:46 | doubtSchema.index({ title: 'text', description: 'text' }); | Enables text search while students type. |
| src/app/api/doubts/similar/route.js:21 | const filter = { $text: { $search: q }, status: 'VERIFIED', flaggedForReview: { $ne: true } }; | Live suggestion query and Verified-only filter. |
| src/lib/similarity.js:21 | return intersection / new Set([...left, ...right]).size; | Jaccard token overlap used for moderator matching. |
| src/lib/duplicate-suggestions.js:20 | if (score < 28) continue; | Limits moderator suggestions to scores of at least 28. |
| src/app/doubts/new/page.jsx:23 | const t = setTimeout(async () => { | Starts the 500 ms debounce timer. |

## Part 7 — Database view

MongoDB stores each collection as documents. Refs below are ObjectId links; MongoDB does not automatically enforce relational foreign keys, so route code checks related records when needed.

| Collection/model | Main Module 3 fields and refs | Indexes declared in schema |
|---|---|---|
| answers / Answer | doubt → Doubt, helper → User, verifiedBy → User, status, content (or legacy body), moderationHistory[] (moderator → User, action, reason, rating, feedback, time), revisions[], assignment and flag fields. | Single-field indexes on doubt/helper/status/flag and demo marker fields; unique sparse developmentTestId/demoKey; compounds {status, createdAt:-1}, {doubt, createdAt:1}, {status, doubt, createdAt:-1}. |
| moderationlogs / ModerationLog | entityType + polymorphic entityId, moderator → User, action, reason/category, optional rating/feedback, polymorphic relatedEntity, idempotency key. | Single-field entityType/entityId/action/demo marker; unique sparse idempotencyKey/demoKey; compounds {createdAt:-1}, {moderator, createdAt:-1}, {action, createdAt:-1}. |
| knowledgeentries / KnowledgeEntry | Unique answer → Answer, doubt → Doubt, verifiedBy → User, title/course/topic/question/answerContent/tags, status, helpful/view counts, archive fields. | Unique answer; indexes for doubt/course/topic/status/demo fields; unique sparse demoKey; compounds course+topic+verifiedAt, status+verifiedAt, status+helpfulCount+verifiedAt, status+viewCount+verifiedAt; text index over title/question/answerContent/topic. |
| notifications / Notification | recipient → User, optional doubt → Doubt and answer → Answer, type/message/href/readAt/dedupeKey. | recipient and demo marker indexes; unique sparse dedupeKey/demoKey; compound {recipient, readAt, createdAt:-1}. |
| doubts / Doubt | author → User, assignedHelper → User, duplicateOf → Doubt, course/topic/title/description/tags/status/flag, ratings[] (user → User, value), average/count. | Text title+description; author+createdAt; course+topic+createdAt; status+createdAt; ratings.user; flag/demo markers; unique sparse developmentTestId/demoKey. |
| users / User | name/email/roles/status/suspension, assignedCourses, department, helper profile including reputation. passwordHash exists but must never be shown in a presentation. | Unique email; role/status/suspended/helper/availability/demo field indexes; unique sparse demoKey; text name+email; compound roles+status. |
| knowledgebookmarks / KnowledgeBookmark | user → User, entry → KnowledgeEntry; personal save, not a public rating. | Unique {user, entry} plus {user, createdAt:-1}. |
| answerfeedbacks / AnswerFeedback | answer → Answer, user → User, helpful boolean and revision number. | Unique {answer, user} plus {answer, helpful}. |

Schema index declarations are in src/models/Answer.js:26-50, Doubt.js:46-50, KnowledgeEntry.js:27-31, ModerationLog.js:22-24, Notification.js:16, and User.js:39-40. The setup script ensures indexes; production connection config sets Mongoose autoIndex false.

### Small illustrative document shapes

These are schema-shaped examples with placeholder IDs, not copied live documents.

~~~js
// answers — compact shape
{
  _id: '<answer ObjectId>', doubt: '<doubt ObjectId>', helper: '<user ObjectId>',
  content: 'A worked explanation…', status: 'VERIFIED', verifiedBy: '<faculty ObjectId>',
  moderationHistory: [{ moderator: '<faculty ObjectId>', action: 'VERIFIED', rating: 5, feedback: 'Clear explanation.', createdAt: '<date>' }]
}
~~~

~~~js
// moderationlogs — compact shape
{
  entityType: 'answer', entityId: '<answer ObjectId>', action: 'VERIFIED',
  moderator: '<faculty ObjectId>', relatedEntity: '<doubt ObjectId>',
  relatedEntityType: 'doubt', idempotencyKey: 'answer:<id>:verified'
}
~~~

~~~js
// knowledgeentries — compact shape
{
  answer: '<answer ObjectId>', doubt: '<doubt ObjectId>', verifiedBy: '<faculty ObjectId>',
  title: 'Why does fractional knapsack use greedy?', course: 'DAA', topic: 'Greedy',
  question: '…', answerContent: '…', status: 'ACTIVE', helpfulCount: 0, viewCount: 0
}
~~~

~~~js
// notifications — compact shape
{
  recipient: '<helper ObjectId>', type: 'ANSWER_VERIFIED', doubt: '<doubt ObjectId>',
  answer: '<answer ObjectId>', message: 'Your answer was verified…',
  href: '/doubts/<id>#answer-<id>', dedupeKey: 'answer:<id>:verified:<recipient id>'
}
~~~

~~~js
// doubt — relevant Module 3 fields
{
  author: '<student ObjectId>', assignedHelper: '<helper ObjectId>', status: 'VERIFIED',
  title: 'Why does fractional knapsack use greedy?', course: 'DAA', topic: 'Greedy',
  duplicateOf: null, ratings: [{ user: '<student ObjectId>', value: 5 }], ratingAverage: 5, ratingCount: 1
}
~~~

~~~js
// user — relevant Module 3 fields; passwordHash intentionally omitted
{
  name: 'Example helper', email: 'helper@example.edu', roles: ['student', 'helper'],
  assignedCourses: [], helperProfile: { reputation: 10, isHelper: true }
}
~~~

A faculty review rating is nested in Answer.moderationHistory; the user rating above is on Doubt. They are separate signals.

## Part 8 — Five-minute live demo script

### The current staged records I checked

I made a read-only query of the configured Doubt database and found these four staged answer records. Statuses can change as soon as anyone rehearses the actions, so recheck the queue before class.

| Staged item | Current answer status in the lookup | Student / author | Helper |
|---|---|---|---|
| “How do we avoid the worst case in quicksort using random pivot?” | FACULTY_PENDING | Priya Sharma — priya.sharma@student.mes.ac.in | Ashish Thakur — ashishpersonalteam@gmail.com |
| “Why is merge sort stable?” | FACULTY_PENDING | Sneha Reddy — sneha.reddy@student.mes.ac.in | Ravi — ravimishra@gmail.com |
| “What makes Red-Black Tree search O(log n)?” | PENDING | Sneha Reddy — sneha.reddy@student.mes.ac.in | Ashish Thakur — ashishpersonalteam@gmail.com |
| “Why does fractional knapsack use greedy while 0/1 knapsack requires DP?” | PENDING | Priya Sharma — priya.sharma@student.mes.ac.in | Ravi — ravimishra@gmail.com |

The seed script prefers these account emails but can fall back to another existing student/helper; this table comes from the read-only records currently in the database, not just the script’s preferred names. The database stores password hashes, not student/helper passwords. Use a password you already know for Priya if you want to demonstrate the student screen. The CR/Faculty/Admin demo credentials were supplied in your request; this guide does not copy passwords into the project file.

### Before the class

- Start the app from peer-doubt with npm run dev; open the local URL printed by Next (usually http://localhost:3000).
- Have CR and Faculty sessions ready in separate browser profiles/tabs so sign-out does not disturb the other role. Keep one known student session ready if you know Priya’s password.
- The walkthrough uses the currently PENDING Fractional Knapsack answer for CR → Faculty → Library. That sequence writes a decision, reputation change, knowledge entry, audit record, and notifications to MongoDB. I did not perform those writes.

### 0:00–0:45 — Introduce the flow

1. Open /moderation and say: “This desk separates the course representative’s first review from final faculty verification. The API checks the role and course on the server.”
2. Click **Answer review**. Point to the queue and say: “This list comes from the queue route, which filters by the role’s review status and course scope.”

### 0:45–1:45 — CR forwards a staged answer

1. Sign in with aman.cr@unstuck.edu; choose the **CR / Faculty** login card and use the CR password you supplied.
2. Click **Answer review**. Leave **Pending** selected. In **Search doubt or helper**, type fractional knapsack.
3. Find **Why does fractional knapsack use greedy while 0/1 knapsack requires DP?** If the card is assigned to another moderator, use the other unassigned staged card or prepare it before class; do not force an assignment conflict live.
4. Click **Approve & forward to faculty**. No written feedback is required for this forward action.
5. Say: “This button sent PATCH to the forward Route Handler. The server changed the Answer from PENDING to FACULTY_PENDING and wrote the audit history.”

### 1:45–3:00 — Faculty verifies

1. Sign out; sign in with neha.sharma@unstuck.edu, choose **CR / Faculty**, and use the Faculty password you supplied.
2. Click **Answer review** and keep **Pending** selected. Search fractional knapsack again; the queue maps this to FACULTY_PENDING for Faculty.
3. Choose **5 stars** (or your preferred rating), enter feedback such as “The counterexample clearly shows why the greedy choice can fail for 0/1 knapsack.”, then click **Verify**.
4. Say: “The server validates rating and feedback, commits the Answer/Doubt/KnowledgeEntry/audit updates together, then attempts notifications after the transaction.”
5. Point out the success message. The helper is Ravi and the asker is Priya for this staged record.

### 3:00–3:45 — Show knowledge reuse

1. Click **Knowledge** in the app navigation or open /knowledge.
2. Search fractional knapsack; set Course to **DAA** and Topic to **Greedy** if needed.
3. Open the matching card. Say: “This page reads active knowledge entries, but the API checks that the linked Answer is still VERIFIED and neither the Answer nor Doubt is flagged or closed as duplicate/rejected.”

### 3:45–4:45 — Show a similar-doubt suggestion

1. Sign in as Priya in a separate profile using the **Student / Student helper** card and a password you already know for this account.
2. Open /doubts/new. Select Course **DAA** and Topic **Greedy**.
3. In Short title, type: Why is fractional knapsack greedy but 0/1 knapsack needs dynamic programming?
4. Pause for at least half a second. The inline panel should show the newly verified question. Click its title to open it in a new tab.
5. Say: “The browser waited 500 milliseconds, then queried MongoDB’s text index. Only verified, unflagged doubts are suggested. This is a suggestion, not a submission blocker.”

### 4:45–5:00 — Close and fallback

Say: “Module 3 creates an auditable review path and turns verified peer explanations into searchable class knowledge.”

**If something breaks:** If Atlas/auth is unavailable, do not run seed, database initializer, verification, or demo-reset scripts during class. Show the file map and code paths in Parts 5–6 instead. If Similar is empty, check that the staged item is now VERIFIED, ensure the student selected DAA/Greedy, then retype the title and wait 500 ms. If student password is unavailable, skip student login and explain the flow from src/app/doubts/new/page.jsx and src/app/api/doubts/similar/route.js. The app’s /api/auth/health endpoint can help distinguish sign-in service trouble from a bad password.

## Part 9 — Viva preparation

### React.js questions

1. **What is a React component?** A function that returns UI; AnswerQueue and KnowledgeBrowser are examples.
2. **What are props?** Inputs passed to a component, such as initialFilters passed from a server page to KnowledgeBrowser.
3. **Why use useState?** To hold changing UI values like form fields, star rating, queue items, errors, and loading state.
4. **What is a controlled input?** Its displayed value comes from React state and its change handler updates that state.
5. **Why use useEffect here?** To load/poll server data or synchronize typing with a debounced search timer.
6. **How does debounce cleanup work?** The effect clears its pending timer and marks its result stale; after a request starts it ignores the result rather than aborting that network request.

### Next.js questions

7. **How does App Router routing work?** Folder segments plus page.jsx, layout.jsx, and route.js filenames define pages/layouts/APIs.
8. **What does [id] mean?** It captures one URL segment; the page/route awaits params and uses that ID to load/update a record.
9. **What is a Route Handler?** A route.js export such as GET or PATCH that handles an HTTP request and returns a response.
10. **Does this project use NextResponse.json for its APIs?** No. API handlers mostly use Response.json; src/proxy.js uses NextResponse for navigation.
11. **Why is AnswerQueue a Client Component?** It uses React state/effects, browser fetch, useSession, and click/input handlers.
12. **How is a session checked?** NextAuth credentials issue a JWT session; server helpers load current user from MongoDB before permission decisions.
13. **What do 401, 403, and 404 mean here?** 401 means not signed in; 403 means role/account/scope denied; 404 means requested ID/record is unavailable. Invalid input is often 400 and a state conflict 409.

### Module 3 design questions

14. **Why two moderation levels?** CRs can do course-level first review; faculty/admin can make the final verification decision.
15. **What happens when a CR forwards?** A pending Answer becomes FACULTY_PENDING, history and audit are written, and review assignment is cleared.
16. **What does the Verify transaction protect?** Answer, helper reputation, Doubt status, KnowledgeEntry, and ModerationLog are updated as one database transaction.
17. **Why is reputation increased by 10?** Code increments helperProfile.reputation by 10 for a verified transition, with a demo-data guard against repeat awards; it is a product rule, not a computed academic score.
18. **How is a similar student question found?** MongoDB text search over Doubt title/description, exact optional course/topic filters, textScore ordering, top five.
19. **How is moderator duplicate matching different?** It is an in-code word-overlap score with course/topic signals over at most 240 recent candidate Doubts; not the student text-index query.
20. **Why can’t a pending/rejected answer appear in Knowledge?** The search aggregation joins the entry to an Answer whose status is exactly VERIFIED; it also excludes flagged Answers/Doubts and duplicate/rejected Doubts.

### Five “why X instead of Y?” answers

1. **Why separate CR forwarding from faculty verification instead of one moderator decision?** It gives two explicit review checkpoints and permissions. The trade-off is an extra queue transition; admins have a server-side exception for legacy/pending work.
2. **Why MongoDB text search and token overlap instead of a paid AI similarity API?** It avoids an external model/service and has predictable local scoring. Lexical overlap can miss paraphrases and over-match shared words.
3. **Why Route Handlers instead of Server Actions?** The existing client UI uses explicit JSON endpoints, HTTP methods, status codes, and reusable APIs. Server Actions could also work, but would require changing this architecture.
4. **Why store a KnowledgeEntry instead of rebuilding the library from Answer each time?** It gives the library an archive state, search fields, verifier/time, counters, and one-entry-per-answer key. The trade-off is duplicated question/answer text that may need synchronization if content changes later.
5. **Why transactions and idempotency keys instead of independent writes?** A verified answer should not be published without matching status/audit changes; idempotency makes retries safer. Notifications are outside the transaction, so they can fail after the decision commits.

### Honest limitations and improvements

- Similarity while typing is lexical, searches only Doubts already marked VERIFIED, returns at most five, and does not stop duplicate submission. Improvement: add semantic matching and a “continue anyway” choice with monitoring for false matches.
- Moderator duplicate scoring is limited to newest 240 in-scope non-duplicate/non-rejected Doubts and exact same course/topic. Improvement: use a scalable candidate index and evaluate thresholds against real examples.
- The new-doubt debounce does not abort an already-running fetch and does not show a search-specific error. Improvement: pass an AbortSignal and render retry/error state.
- Faculty rating/feedback are stored in Answer.moderationHistory; recordModerationAction() is not passed those values, even though ModerationLog has optional rating/feedback fields. Improvement: decide whether audit log should also carry review details.
- Knowledge cards say answers were reviewed by “a CR or faculty member,” but final verify permission is faculty/admin only. CRs forward; they cannot call verify. Update that copy if it is meant to describe the final verifier.
- A CR rejection route does not reopen Doubt to CLAIMED; faculty/admin rejection attempts that transition. The README’s broad statement that rejection reopens the claim needs this role-specific qualification.
- Forward notifications are not sent by the CR forward route. Final verification notifications are best-effort after the transaction; failure does not roll back the verified answer.
- Transactions require MongoDB deployment support such as a replica set. A standalone local MongoDB may not support this workflow.

## Part 10 — Spoken scripts

### Two-minute version

“Module 3 is the review and knowledge-reuse part of unStuck. A helper first writes an answer to a student’s doubt. A Course Representative checks it and can forward it, reject it, or flag the doubt as a duplicate. A forwarded answer goes to the Faculty queue. Faculty give a one-to-five rating and written feedback, then verify, request an improvement, or reject.

The interface is built from React components. The moderation queue uses state for its filters, rating, feedback, loading, and errors. When a reviewer clicks a button, the browser sends a PATCH request to a Next.js Route Handler. The handler checks the NextAuth session, role, course scope, input, and current answer status before changing anything.

When faculty verify, the server saves the decision in MongoDB, updates the Doubt, gives the helper ten reputation points when appropriate, creates one KnowledgeEntry for that answer, and records an audit log in a transaction. It then tries to notify the helper and asker. Students can search active verified explanations in the Knowledge Library. While a student types a new question, React waits half a second and asks MongoDB text search for similar verified doubts. This reduces repeat questions and lets useful answers help the next student.”

### Five-minute version with demo

“Module 3 takes an answer from a helper and decides whether it is safe and useful to reuse. The CR does the first review. Faculty make the final verification. Verified answers become knowledge entries that other students can search.

I’m signed in as the CR. I open Answer review and search for the staged Fractional Knapsack question. I click Approve and forward to faculty. This button sends a PATCH request to the forward Route Handler. The server checks that I am a CR and that the doubt is in my assigned courses. It changes the answer from PENDING to FACULTY_PENDING and records the action.

Now I sign in as Faculty, return to Answer review, and search for the same question. I select five stars, write feedback, and click Verify. The client sends the rating and feedback to the verify route. The server checks my current role, course scope, answer state, and review assignment. In a database transaction it marks the answer VERIFIED, updates the doubt, awards helper reputation, creates the KnowledgeEntry, and records the audit log. After the transaction it attempts notifications for helper and asker.

I open Knowledge Library and search for fractional knapsack. This is the knowledge-reuse step. The API only returns active entries linked to a verified, unflagged answer and an eligible doubt. The library stores who verified the explanation and when.

Finally, I sign in as the student and open New doubt. I select DAA and Greedy and type a similar fractional-knapsack question. React’s effect waits 500 milliseconds, then calls /api/doubts/similar. MongoDB searches the title and description text index; the route returns only verified, unflagged matches. I open the suggested question instead of submitting a repeat.

That is the complete Module 3 loop: review, verify, preserve, and reuse. The app uses React for interactive state, Next.js App Router pages and Route Handlers for navigation and APIs, and Mongoose models for MongoDB records.”

## Before presenting — code facts to remember

- Normal path: helper answer PENDING → CR forward FACULTY_PENDING → Faculty/admin VERIFIED, REVISION_REQUESTED, or REJECTED.
- “Needs improvement” is an action label/history value; Answer status is REVISION_REQUESTED.
- CR duplicate marking changes Doubt to DUPLICATE; it is not an Answer status transition.
- Student typing suggestions use MongoDB $text over title/description and Verified-only filtering. Moderator suggestions use a separate weighted word-overlap scorer and can include non-verified candidates.
- Faculty review rating is on Answer history; student question ratings are on Doubt.
- CR forwarding does not notify; final verification notification is attempted after the transaction and can fail without undoing the decision.
- The live staged records currently map to Priya/Sneha as students and Ravi/Ashish as helpers; their passwords are not available from the database query.
