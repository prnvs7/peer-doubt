# unStuck

unStuck is a Next.js App Router application for student questions, peer explanations, moderator verification, and searchable class knowledge. It uses Next.js 16, React 19, NextAuth credentials sessions, MongoDB/Mongoose, Zod, and Tailwind CSS 4.

## Development setup

Requirements: Node.js 20.9 or newer, npm, and access to the shared MongoDB Atlas cluster.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` to the shared Atlas application connection string and `MONGODB_DB=Doubt`. `MONGODB_DB` takes precedence over any database path in the URI.
4. Set a private `NEXTAUTH_SECRET` and `NEXTAUTH_URL=http://localhost:3000`.
5. Start with `npm run dev` and open `http://localhost:3000`.

## Production deployment

For Vercel, add these variables in **Project Settings → Environment Variables** for the Production environment:

- `MONGODB_URI`: the Atlas application connection string for the `Doubt` database.
- `MONGODB_DB`: `Doubt`.
- `NEXTAUTH_SECRET`: a private random value. Generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` and paste the output into Vercel; do not commit it.
- `NEXTAUTH_URL`: the full canonical production URL, such as `https://your-project.vercel.app`.

Configure Preview variables separately if you need preview sign-in, and use a stable preview hostname that matches `NEXTAUTH_URL`. Redeploy after changing environment variables. The public landing page remains available when the auth secret is missing, while the login page reports the required production configuration.

The application selects the existing Atlas database `Doubt`; `MONGODB_DB` takes precedence over the URI path. Run `npm run db:init` to create or reuse the application collections and indexes derived from the Mongoose models without inserting documents. The canonical course list remains static in `src/lib/courses.js`; no Course model is required. All team members must use the same cluster, `Doubt` database, and application database user. MongoDB Compass is only a database client; the app connects directly from its backend.

Use a dedicated application database user scoped to `readWrite` on `Doubt`; do not put an Atlas administrator credential in app configuration. The application code cannot change Atlas user roles. Add each developer's current IP to Atlas Network Access; do not use unrestricted public access as the default. Percent-encode special characters in the URI username and password. Never use Atlas credentials as application login credentials.

Public registration creates active student accounts only and ignores any client-supplied role. Students opt into helper access by selecting courses and enabling availability from **Become a helper**; helpers retain student abilities. CR and faculty access is provisioned by an administrator. The User model stores an enum `role`, compatible `roles` values, account `status`, helper availability/courses, CR `assignedCourses`, and faculty `department`/course scope. Protected APIs and server layouts reload the current user from MongoDB for each request; session roles are for display only.

Useful checks:

```sh
npm run db:init
npm run db:verify:module3 -- --confirm-module3-test
npm run lint
npm run typecheck
npm test
npm run build
```
## Module 2: Peer Assistance & Answer Submission

Module 2 is responsible for the peer-learning and doubt-resolution workflow of unStuck. It allows students to volunteer as helpers, browse unresolved academic doubts, claim questions they are capable of answering, and submit explanations to help other students understand difficult concepts.

### Key Features

- **Helper Opt-in System:** Students can voluntarily become helpers by selecting the subjects or courses they are comfortable assisting with and enabling their helper availability.
- **Helper Workspace:** A dedicated interface for helpers to browse open doubts, view relevant academic questions, and manage the doubts they have claimed.
- **Doubt Claiming:** Helpers can claim open doubts to take responsibility for answering them. The system prevents multiple helpers from claiming the same doubt simultaneously.
- **Answer Submission:** Assigned helpers can submit explanations and solutions to claimed doubts.
- **Pending Answer Workflow:** Submitted answers are stored with a pending status, allowing them to proceed to the moderation and verification process.
- **Student-Helper Integration:** Students retain their normal platform functionality while opting into helping others, encouraging collaborative learning within the community.
- **Doubt Status Management:** The system updates doubt statuses as they progress from open to claimed and answered, maintaining consistency across the platform.

### Workflow

1. A student opts into helper access and selects the courses they can assist with.
2. The helper accesses the dedicated workspace and browses available open doubts.
3. The helper claims a doubt they can confidently answer.
4. The doubt is assigned to the helper, preventing competing claims.
5. The helper submits their explanation or solution.
6. The answer is stored as pending and becomes available for the moderation and verification workflow.

### Objective

The primary objective of Module 2 is to promote peer-to-peer academic learning by connecting students who need help with students who can provide meaningful explanations, while ensuring that submitted answers can be reviewed for accuracy and quality before becoming verified learning resources.

The Module 3 persistence check is restricted to the configured non-production Atlas `Doubt` database. It creates randomly tagged temporary records, checks ratings, feedback, bookmarks, notification state, report uniqueness, moderation history, revisions, and knowledge publication, then deletes and verifies removal of its records.

The repository does not have a separate integration-test runner. A guarded development seed creates exactly one doubt and pending answer in `Doubt`, using existing student, willing helper, and CR/faculty accounts. It marks both records with `PEER_DOUBT_MODULE3_TEST_001`, aborts on conflicting records, missing accounts, or populated unrelated collections, does not grant roles, and never marks the answer verified automatically.

For isolated RBAC testing, set a local-only `RBAC_TEST_PASSWORD` environment variable and run `npm run seed:rbac-users -- --confirm-rbac-users`. This creates prefixed `unstuck-rbac+<role>@example.test` accounts for student, helper, CR, faculty, and admin with bcrypt-hashed passwords. The script never updates an existing account or deletes data, uses OS as the CR/helper course, and assigns faculty to the configured Computer Science course set. Keep the password local and do not commit it. The script refuses production targets.

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
- CRs, faculty, and admins can verify, reject, request correction, and claim pending reviews, subject to server-side course scope. Faculty and admins can reconsider rejected answers and archive knowledge. Verification moves the doubt to `VERIFIED` and upserts one knowledge entry per answer. Rejection reopens the claim for the assigned helper.
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

CRs and faculty can make moderation decisions within their assigned courses; admins can moderate across all courses. CR course assignments and faculty department/course scope are applied in database queries. Only admins can manage roles and account status. A signed-in user can browse verified knowledge and rate another user's question after an answer is submitted; authors cannot rate their own questions. A person's rating is updated in place, and averages/counts are stored on the doubt. Rejections use a structured reason category and optional explanation. Reports have per-user duplicate-open-report checks and a retained decision history.

The dashboard reports live moderation counts, average verification time, reports resolved, activity, and verified knowledge by course/topic. Helper analytics use answer and feedback records. Knowledge search supports text, course/topic filters, helpfulness and view sorting; only active entries tied to verified answers appear. Archive actions preserve answer and moderation history. Notifications are user-scoped and refresh by polling.

## Permission matrix

| Action | Student | Helper | CR | Faculty | Administrator |
| --- | --- | --- | --- | --- | --- |
| Ask, report, rate another question, browse/save verified knowledge | Yes | Yes | Yes | Yes | Yes |
| Submit or revise own requested answer | No | Yes | No | No | No |
| Verify/reject/request corrections, manage reports and duplicates | No | No | Assigned courses | Department/courses | All courses |
| Reconsider rejected answers and archive knowledge | No | No | No | Department/courses | All courses |
| Grant roles, assign courses, or suspend accounts | No | No | No | No | Yes |

The first administrator must be provisioned through a trusted setup path; after that, administrators can grant roles and scope through **User access**. Public registration and helper profile APIs cannot grant CR, faculty, or admin access. Administrators cannot change their own account, and the final active administrator cannot be demoted or suspended. User role, course, department, suspension, and reactivation changes are written to the audit log. Helper eligibility is only granted by the student's opt-in.

## Themes and interface

The light/dark palette is defined by CSS variables in `src/app/globals.css`. The preference is stored in browser local storage, and reduced-motion preferences are respected. Pages show loading, error, and empty states for their data flows. The app adds content-type, framing, referrer, and permissions headers through Next.js configuration.

## Earlier verification performed

- `npm test`: passed; all 5 navigation and similarity tests passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run db:init`: passed against Atlas database `Doubt`; all nine model collections and indexes were verified, and the run inserted/deleted zero documents.
- `npm run db:verify:module3 -- --confirm-module3-test`: passed against `Doubt`; all persistence checks passed and temporary records were removed and verified absent.
- Feature test seed: not run; the guarded development seed refuses this shared database because it contains populated unmodeled collections.
- Signed-in end-to-end workflows were not exercised with shared user accounts. The persistence smoke test used no user accounts and left no test records behind.

## Current RBAC recheck (2026-11-16)

- `npm test`: passed; all 16 unit and guard-contract tests passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed for the RBAC policy/scope modules and NextAuth declarations. Most application source remains JavaScript.
- `npm run build`: passed.
- Unauthenticated production API checks returned 401 for auth/me, knowledge, moderation queue/stats, answer verify/reject, reports, admin users, and notifications.
- Signed-in per-role HTTP/browser walkthrough was not run. This local environment has no `RBAC_TEST_PASSWORD` and no `MONGODB_DNS_SERVERS` override, so the prefixed account seed was not run and no database records were changed.
- 
https://peer-doubt-rouge.vercel.app/
