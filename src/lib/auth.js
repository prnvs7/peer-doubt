import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export const authOptions = {
    session: { strategy: 'jwt' },
    pages: { signIn: '/login' },
    providers: [
        CredentialsProvider({
            credentials: { email: {}, password: {} },
            async authorize(credentials) {
                const email = credentials?.email?.trim().toLowerCase();
                const password = credentials?.password;
                if (!email || typeof password !== 'string' || !password) return null;
                try {
                    await connectDB();
                } catch (error) {
                    console.error('AUTH_DATABASE_UNAVAILABLE', {
                        name: error?.name || 'Error',
                        code: error?.code || error?.cause?.code || 'UNKNOWN',
                    });
                    throw new Error('Authentication database unavailable');
                }
                const user = await User.findOne({ email });
                if (!user?.passwordHash || user.isSuspended) return null;
                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return null;
                return { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
            } else if (trigger === 'update' && token.id) {
                await connectDB();
                const currentUser = await User.findById(token.id).select('roles').lean();
                if (currentUser) token.roles = currentUser.roles || [];
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id;
            session.user.roles = token.roles;
            return session;
        },
    },
};
