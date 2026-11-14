# Atlas Database Initialization Status

## Live database

- The saved application URI connects to Atlas host `cluster28.b2j4hk4.mongodb.net`, matching a local Compass profile for that host.
- The application is configured to use the existing database `Doubt`. The database `peer_doubt_app` did not exist during inspection, so no competing database was created.
- The first inventory found `Doubt.users` and `Doubt.test` empty. It found the standard six `sample_mflix` collections and their demo records.
- A later inventory, after initialization, found `sample_mflix` and the original empty `Doubt.test` collection absent. It found `Doubt` containing 5 users, 6 doubts, 5 answers, 1 knowledge entry, 2 reports, 3 moderation logs, and 3 documents in an unmodeled `course` collection. These database changes occurred between inventory snapshots. The initializer reports zero inserted and zero deleted documents and contains no drop operation; the source of the changes is unknown. All currently present records and the `course` collection are preserved.
- `sample_mflix` disappeared before its backup could begin. The backup script reported the database empty; no verified backup was created and this workspace did not drop the database. The final Atlas list no longer includes `sample_mflix`.

## Model and application contract

Mongoose uses these collection names:

- `User` → `users`
- `Doubt` → `doubts`
- `Answer` → `answers`
- `KnowledgeEntry` → `knowledgeentries`
- `Report` → `reports`
- `ModerationLog` → `moderationlogs`

Authentication uses NextAuth JWT sessions, so it does not require an auth session collection. Courses are configured statically in `src/lib/courses.js`; no Course model or course collection is created by the initializer. The pre-existing `course` collection and its 3 documents are left untouched.

## Initialization

`npm run db:init` connects through the shared Mongoose connection, requires the verified Atlas host and `MONGODB_DB=Doubt`, creates missing model collections, and creates schema indexes without dropping indexes or modifying documents.

- First run: `users` already existed; `doubts`, `answers`, `knowledgeentries`, `reports`, and `moderationlogs` were created. Schema indexes were created; `users.email` already had its unique index. Existing `test` was preserved. Zero documents were inserted or deleted.
- Second run: all six model collections and indexes were already present; no indexes were added and zero documents were inserted or deleted. The unmodeled `course` collection was reported as preserved.
- The guarded `sample_mflix` backup and removal scripts are available, but removal was not run. The backup could not proceed because the database was already absent.

## Validation

- Atlas connection and configured database: **PASSED** through Mongoose (`Doubt`).
- Model-to-collection names and indexes: **PASSED**; verified by the initializer output.
- Initializer repeatability: **PASSED**; second run created no collections or indexes.
- `sample_mflix` removal by this workspace: **NOT RUN**; it was already absent.
- During schema initialization, no users, doubts, answers, reports, ratings, or knowledge records were inserted.
- Application registration/login and moderation workflow: **NOT TESTED** in this initialization task.

## Module 3 schema extension

The current application also uses `AnswerFeedback` (`answerfeedbacks`), `KnowledgeBookmark` (`knowledgebookmarks`), and `Notification` (`notifications`). The guarded initializer now includes these models and their indexes. The latest run connected to the configured `Doubt` database and verified all nine application models. It created `answerfeedbacks` and `knowledgebookmarks`, added indexes for review flags, knowledge lifecycle/sorting, user search, and one-open-report prevention, and inserted/deleted zero documents. The existing `course` collection was preserved.

## Module 3 persistence smoke check

`npm run db:verify:module3 -- --confirm-module3-test` passed against the guarded non-production `Doubt` database. It verified knowledge publication uniqueness, rating aggregates, unique helpful votes and bookmarks, notification deduplication/read state, one-open-report prevention, moderation audit persistence, and answer revisions. The script removed its randomly tagged temporary records and confirmed zero tagged records remained. It does not exercise signed-in HTTP workflows or create user accounts.
