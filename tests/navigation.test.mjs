import assert from 'node:assert/strict';
import test from 'node:test';
import { getNavigationLinks } from '../src/lib/navigation.mjs';

function routesFor(roles) {
    return getNavigationLinks(roles).map(({ href }) => href);
}

test('students can discover the helper opt-in without seeing the protected workspace link', () => {
    const routes = routesFor(['student']);
    assert.ok(routes.includes('/helper/profile'));
    assert.ok(!routes.includes('/helper'));
    assert.ok(!routes.includes('/moderation'));
});

test('existing helpers see the helper workspace link', () => {
    const routes = routesFor(['student', 'helper']);
    assert.ok(routes.includes('/helper'));
    assert.ok(!routes.includes('/helper/profile'));
});

test('CR and faculty receive moderation navigation while retaining their other roles', () => {
    assert.ok(routesFor(['cr']).includes('/moderation'));
    assert.ok(routesFor(['faculty']).includes('/moderation'));
    assert.ok(!routesFor(['student']).includes('/moderation'));
});

test('only provisioned administrators receive user access navigation', () => {
    assert.ok(routesFor(['admin']).includes('/admin/users'));
    assert.ok(!routesFor(['student']).includes('/admin/users'));
    assert.ok(!routesFor(['cr']).includes('/admin/users'));
});
