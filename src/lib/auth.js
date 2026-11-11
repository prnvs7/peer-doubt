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
                await connectDB();
                const user = await User.findOne({ email: credentials?.email?.toLowerCase() });
                if (!user) return null;
                const ok = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!ok) return null;
                return { id: user._id.toString(), name: user.name, email: user.email, roles: user.roles };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.roles = user.roles;
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