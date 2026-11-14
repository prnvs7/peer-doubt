import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/models/User';

const schema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    password: z.string().min(6),
});

export async function POST(req) {
    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success)
            return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

        const { name, email, password } = parsed.data;
        await connectDB();

        if (await User.findOne({ email }))
            return Response.json({ msg: 'Email already registered' }, { status: 409 });

        const passwordHash = await bcrypt.hash(password, 10);
        await User.create({ name, email, passwordHash });
        return Response.json({ msg: 'Registered' }, { status: 201 });
    } catch (err) {
        if (err?.code === 11000)
            return Response.json({ msg: 'Email already registered' }, { status: 409 });
        console.error('REGISTER_FAILED', { name: err?.name || 'Error', code: err?.code || 'UNKNOWN' });
        return Response.json({ msg: 'Registration could not be completed. Check the application database configuration and try again.' }, { status: 500 });
    }
}
