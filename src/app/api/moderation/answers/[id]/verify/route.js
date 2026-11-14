import { moderateAnswer } from '@/lib/answer-moderation';

export async function PATCH(req, { params }) {
    return moderateAnswer(req, params, 'VERIFIED');
}
