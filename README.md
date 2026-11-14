# unStuck

unStuck is a Next.js App Router application for student questions, peer explanations, moderator verification, and searchable class knowledge. It uses Next.js 16, React 19, NextAuth credentials sessions, MongoDB/Mongoose, Zod, and Tailwind CSS 4.

## Development setup

Requirements: Node.js 20.9 or newer, npm, and access to the shared MongoDB Atlas cluster.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` to the shared Atlas application connection string and `MONGODB_DB=Doubt`. `MONGODB_DB` takes precedence over any database path in the URI.
4. Set a private `NEXTAUTH_SECRET` and `NEXTAUTH_URL=http://localhost:3000`.
5. Start with `npm run dev` and open `http://localhost:3000`.

The application selects the existing Atlas database `Doubt`; `MONGODB_DB` takes precedence over the URI path. Run `npm run db:init` to create or reuse the application collections and indexes derived from the Mongoose models without inserting documents. The canonical course list remains static in `src/lib/courses.js`; no Course model is required. All team members must use the same cluster, `Doubt` database, and application database user. MongoDB Compass is only a database client; the app connects directly from its backend.

Use a dedicated application database user scoped to `readWrite` on `Doubt`; do not put an Atlas administrator credential in app configuration. The application code cannot change Atlas user roles. Add each developer's current IP to Atlas Network Access; do not use unrestricted public access as the default. Percent-encode special characters in the URI username and password. Never use Atlas credentials as application login credentials.

Public registration creates student accounts only. Students opt into the helper role by selecting at least one course and enabling availability from **Become a helper**. This only grants access to the helper workspace; CR and faculty roles must still be provisioned by an authorized administrator using the existing `roles` field. Do not share an administrator password between developers. Each person signs into the app with their own application account.

Useful checks:

```sh
npm run db:init
npm run db:verify:module3 -- --confirm-module3-test
npm run lint
npm run build
```

The Module 3 persistence check is restricted to the configured non-production Atlas `Doubt` database. It creates randomly tagged temporary records, checks ratings, feedback, bookmarks, notification state, report uniqueness, moderation history, revisions, and knowledge publication, then deletes and verifies removal of its records.

The repository does not have a separate integration-test runner. A guarded development seed creates exactly one doubt and pending answer in `Doubt`, using existing student, willing helper, and CR/faculty accounts. It marks both records with `PEER_DOUBT_MODULE3_TEST_001`, aborts on conflicting records, missing accounts, or populated unrelated collections, does not grant roles, and never marks the answer verified automatically.

```sh
npm run seed:dev -- --confirm-dev
npm run cleanup:dev -- --confirm-dev
```

Both commands use the database selection from `src/lib/db.js` and refuse production deployments. Cleanup removes only records carrying the exact test identifier and stops if other answers or reports refer to the test doubt. Use them only with the shared Atlas project database.

## Architecture and ownership

- Module 1 owns doubt creation and the existing student doubt pages. Doubts use MongoDB ObjectIds and the shared `Doubt` model.
- Module 2 owns helper answering. This checkout includes a student opt-in path, helper workspace, atomic doubt claiming, and pending-answer submission so the full flow can be exercised. Coordinate these shared role and helper profile changes with the Module 2 owner before merging if they have parallel implementations.
- Module 3 owns answer moderation, duplicate decisions, reports, moderation history, ratings, and verified knowledge.
- `src/lib/db.js` is the single cached Mongoose connection. It uses `MONGODB_DB` so each environment selects the same database.
- `src/lib/session.js` re-reads roles from the shared database for server-side authorization, so a stale signed session cannot retain removed moderator privileges.

## Shared data contract

Use the shared `Doubt`, `Answer`, `User`, `Report`, `ModerationLog`, `KnowledgeEntry`, `AnswerFeedback`, `KnowledgeBookmark`, and `Notification` models. Do not duplicate doubt or answer content in operational collections.

### Doubts and answers

- Module 1 creates doubts with `title`, `description`, `course`, `topic`, `author`, optional `isAnonymous`, and status `OPEN`.
- A helper with the `helper` role claims an open doubt; the status becomes `CLAIMED` and `assignedHelper` is set.
- A claimed helper posts `content` to `/api/doubts/:id/answers`. The app creates an `Answer` with status `PENDING` and advances the doubt to `ANSWERED`.
- The asker may accept a pending answer, recording helper reputation; accepted answers remain eligible for moderator review.
- CRs and faculty can verify, reject, request correction, and claim pending reviews. Faculty can reconsider rejected answers. Verification moves the doubt to `VERIFIED` and upserts one knowledge entry per answer. Rejection reopens the claim for the assigned helper.
- Duplicate decisions set the newer doubt to `DUPLICATE` and point `duplicateOf` at the retained original. No doubt or answer is deleted.

The moderation queue also reads legacy answer statuses `SUBMITTED`, `PENDING_REVIEW`, and `ACCEPTED`, and both the legacy `body` and current `content` answer fields. New answers should use `PENDING` and `content`. Moderators must not review their own answers.

### Module 3 APIs

- `GET /api/moderation/stats`
- `GET /api/moderation/queue?type=answers|reports&page=1&limit=20`
- `GET /api/moderation/history?type=&action=&moderator=&from=&to=&page=1&limit=25`
- `PATCH /api/moderation/answers/:id/verify`
- `PATCH /api/moderation/answers/:id/reject` with a required reason
- `PATCH /api/moderation/answers/:id/revise` with a correction note
- `PATCH /api/moderation/answers/:id/reconsider` (faculty only)
- `PUT|DELETE /api/moderation/answers/:id/assign`
- `GET /api/moderation/duplicates`
- `PATCH /api/doubts/:id/duplicate` with `decision`, `originalDoubtId`, and optional `reason`
- `POST /api/reports` with `targetType`, `target`, `reasonCategory`, and optional `details`
- `GET /api/reports?status=OPEN&type=doubt|answer&page=1&limit=20`
- `PATCH /api/reports/:id` with `decision: FLAG|RESOLVE|DISMISS` and optional `note`
- `PUT /api/doubts/:id/rating` with an integer rating from 1 to 5
- `GET /api/knowledge?q=&course=&topic=&page=1&limit=20`
- `GET /api/knowledge/:id`
- `PUT /api/knowledge/:id/bookmark` with `{ saved: boolean }`; bookmarks belong to the signed-in user
- `GET /api/knowledge/bookmarks`
- `PATCH /api/knowledge/:id` to archive with a reason (faculty/admin only)
- `GET /api/notifications`, `PATCH /api/notifications`, `PATCH /api/notifications/:id`
- `GET /api/helper/analytics`
- `GET|PATCH /api/admin/users` (administrator only)

Only `cr` and `faculty` can make moderation decisions. Any signed-in user can browse verified knowledge and rate another user's question after an answer is submitted; authors cannot rate their own questions. A person's rating is updated in place, and averages/counts are stored on the doubt. Rejections use a structured reason category and optional explanation. Reports have per-user duplicate-open-report checks and a retained decision history.

The dashboard reports live moderation counts, average verification time, reports resolved, activity, and verified knowledge by course/topic. Helper analytics use answer and feedback records. Knowledge search supports text, course/topic filters, helpfulness and view sorting; only active entries tied to verified answers appear. Archive actions preserve answer and moderation history. Notifications are user-scoped and refresh by polling.

## Permission matrix

| Action | Student | Helper | CR | Faculty | Administrator |
| --- | --- | --- | --- | --- | --- |
| Ask, report, rate another question, browse/save verified knowledge | Yes | Yes | Yes | Yes | Yes |
| Submit or revise own requested answer | No | Yes | No | No | No |
| Verify/reject/request corrections, manage reports and duplicates | No | No | Yes | Yes | No |
| Reconsider rejected answers and archive knowledge | No | No | No | Yes | Yes |
| Grant CR/faculty roles or suspend accounts | No | No | No | No | Yes |

Administrator access must be provisioned through trusted database administration; public registration and helper profile APIs cannot grant it. Helper eligibility follows the existing Module 2 opt-in flow.

## Themes and interface

The light/dark palette is defined by CSS variables in `src/app/globals.css`. The preference is stored in browser local storage, and reduced-motion preferences are respected. Pages show loading, error, and empty states for their data flows. The app adds content-type, framing, referrer, and permissions headers through Next.js configuration.

## Verification performed

- `npm test`: passed; all 5 navigation and similarity tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run db:init`: passed against Atlas database `Doubt`; all nine model collections and indexes were verified, and the run inserted/deleted zero documents.
- `npm run db:verify:module3 -- --confirm-module3-test`: passed against `Doubt`; all persistence checks passed and temporary records were removed and verified absent.
- Feature test seed: not run; the guarded development seed refuses this shared database because it contains populated unmodeled collections.
- Signed-in end-to-end workflows were not exercised with shared user accounts. The persistence smoke test used no user accounts and left no test records behind.
