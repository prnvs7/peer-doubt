import assert from 'node:assert/strict';
import test from 'node:test';
import { compareDoubts } from '../src/lib/similarity.js';

test('matching tags strengthen a duplicate suggestion and add a tag signal', () => {
    const left = {
        title: 'Deadlock prevention',
        description: 'Explain resource allocation.',
        course: 'OS',
        topic: 'Deadlocks',
        tags: ['Resource Allocation', 'Process Synchronization'],
    };
    const right = {
        title: 'Deadlock handling',
        description: 'How process synchronization works.',
        course: 'OS',
        topic: 'Deadlocks',
        tags: ['Resource Allocation', 'Process Synchronization'],
    };
    const withoutTags = compareDoubts({ ...left, tags: [] }, { ...right, tags: [] });
    const withTags = compareDoubts(left, right);

    assert.ok(withTags.score > withoutTags.score);
    assert.ok(withTags.signals.includes('Related tags'));
});
