const BASE_LINKS = [
    { href: '/doubts/mine', label: 'My doubts' },
    { href: '/doubts/new', label: 'Ask a doubt' },
    { href: '/knowledge', label: 'Knowledge library' },
    { href: '/knowledge/saved', label: 'Saved knowledge' },
    { href: '/notifications', label: 'Notifications' },
];

export function getNavigationLinks(roles = []) {
    const links = [...BASE_LINKS];
    if (roles.includes('helper')) {
        links.splice(2, 0, { href: '/helper', label: 'Help classmates' });
    } else if (roles.includes('student')) {
        links.splice(2, 0, { href: '/helper/profile', label: 'Become a helper' });
    }
    if (roles.some((role) => ['cr', 'faculty'].includes(role))) {
        links.push({ href: '/moderation', label: 'Moderation' });
    }
    if (roles.includes('admin')) links.push({ href: '/admin/users', label: 'User access' });
    return links;
}
