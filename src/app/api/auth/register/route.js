import bcrypt from 'bcryptjs';
import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/models/User';

const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(req) {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
        return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    const { name, email, password } = parsed.data;
    await connectDB();

    if (await User.findOne({ email: email.toLowerCase() }))
        return Response.json({ msg: 'Email already registered' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash });
    return Response.json({ msg: 'Registered' }, { status: 201 });
}