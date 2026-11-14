export const TEST_ID = 'PEER_DOUBT_MODULE3_TEST_001';
export const TEST_TITLE = 'Understanding Deadlock Prevention and Avoidance in Operating Systems';
export const TEST_DESCRIPTION = `I am studying deadlocks in Operating Systems and am confused about the difference between deadlock prevention and deadlock avoidance.

I understand that deadlock occurs when processes compete for limited resources, but I am unable to understand how the four necessary conditions for deadlock are prevented in practice.

Could someone explain:
1. What are the four necessary conditions for deadlock?
2. How can each condition be prevented?
3. What is the difference between deadlock prevention and deadlock avoidance?
4. Can you provide a simple practical example?`;
export const TEST_TAGS = ['Operating Systems', 'Deadlock', 'Resource Allocation', 'Process Synchronization'];
export const TEST_ANSWER = `Deadlock prevention is a technique used by an Operating System to ensure that at least one of the four necessary conditions for deadlock cannot occur.

The four conditions are:
1. Mutual Exclusion: At least one resource must be non-shareable. Prevention can involve making resources shareable wherever possible.
2. Hold and Wait: A process should not hold resources while waiting for additional resources. One approach is to require processes to request all required resources before execution.
3. No Preemption: Resources can be taken away from a process when it cannot obtain the additional resources it needs, where the resource type permits preemption.
4. Circular Wait: Impose a fixed ordering of resources and require processes to request them in that order.

Difference between prevention and avoidance:
- Deadlock prevention structurally ensures that at least one necessary deadlock condition cannot hold.
- Deadlock avoidance examines resource allocation requests and grants them only when the resulting state remains safe.

Example:
If processes must request resources in a predefined order, circular waiting can be prevented. This breaks one of the necessary conditions for deadlock.`;

// The existing application contract stores course/topic keys rather than display labels.
export const COURSE = 'OS';
export const TOPIC = 'Deadlocks';

export function assertDevelopmentSeedAllowed() {
    if (!process.argv.includes('--confirm-dev')) {
        throw new Error('Pass --confirm-dev to run this development-only database operation.');
    }
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw new Error('Development scenario scripts cannot run in a production deployment.');
    }

    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI is required.');
    const uriDatabase = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/i)?.[1];
    const databaseName = process.env.MONGODB_DB?.trim()
        || (uriDatabase ? decodeURIComponent(uriDatabase) : 'Doubt');
    if (!databaseName || ['admin', 'local', 'config'].includes(databaseName.toLowerCase())) {
        throw new Error('The configured database is not an application database; no data was changed.');
    }
    if (/(^|[-_])(prod|production|live)([-_]|$)/i.test(databaseName)) {
        throw new Error('Development scenario scripts cannot target a production database.');
    }
    return databaseName;
}
