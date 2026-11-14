import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function proxy(req) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    if (!token) {
        const url = new URL('/login', req.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
    }

    if (
        pathname.startsWith('/moderation') &&
        !token.roles?.some((r) => ['cr', 'faculty'].includes(r))
    ) {
        return NextResponse.redirect(new URL('/doubts/mine', req.url));
    }

    if (pathname.startsWith('/admin') && !token.roles?.includes('admin')) {
        return NextResponse.redirect(new URL('/doubts/mine', req.url));
    }

    const canOpenHelperProfile =
        pathname === '/helper/profile' && token.roles?.includes('student');
    if (pathname.startsWith('/helper') && !token.roles?.includes('helper') && !canOpenHelperProfile) {
        return NextResponse.redirect(new URL('/doubts/mine', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/doubts/:path*', '/helper/:path*', '/moderation/:path*', '/knowledge/:path*', '/notifications/:path*', '/admin/:path*'],
};
