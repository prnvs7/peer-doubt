const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'how',
    'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'what', 'when',
    'where', 'which', 'why', 'with', 'would', 'you',
]);

function tokens(value = '') {
    return new Set(
        String(value)
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    );
}

function overlap(left, right) {
    if (!left.size || !right.size) return 0;
    const intersection = [...left].filter((word) => right.has(word)).length;
    return intersection / new Set([...left, ...right]).size;
}

export function compareDoubts(a, b) {
    const titleScore = overlap(tokens(a.title), tokens(b.title));
    const descriptionScore = overlap(tokens(a.description), tokens(b.description));
    const tagScore = overlap(tokens((a.tags || []).join(' ')), tokens((b.tags || []).join(' ')));
    const sameCourse = String(a.course || '').toLowerCase() === String(b.course || '').toLowerCase();
    const sameTopic = String(a.topic || '').toLowerCase() === String(b.topic || '').toLowerCase();
    const score = Math.min(1, titleScore * 0.62 + descriptionScore * 0.2 + Number(sameCourse) * 0.1 + Number(sameTopic) * 0.08 + tagScore * 0.1);
    const signals = [];
    if (titleScore >= 0.18) signals.push('Similar title wording');
    if (descriptionScore >= 0.12) signals.push('Related description');
    if (tagScore >= 0.12) signals.push('Related tags');
    if (sameCourse) signals.push('Same course');
    if (sameTopic) signals.push('Same topic');
    return { score: Math.round(score * 100), signals };
}
