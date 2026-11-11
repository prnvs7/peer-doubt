export { default } from 'next-auth/middleware';

export const config = {
    matcher: ['/doubts/:path*', '/helper/:path*', '/moderation/:path*'],
};