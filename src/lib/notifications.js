import Notification from '@/models/Notification';

export async function notifyUsers(recipients, notification) {
    const ids = [...new Set((recipients || []).filter(Boolean).map(String))];
    if (!ids.length) return;
    const content = { ...notification, message: String(notification.message || '').trim().slice(0, 240) };
    await Promise.all(ids.map((recipient) => Notification.updateOne(
        { recipient, dedupeKey: `${content.dedupeKey}:${recipient}` },
        { $setOnInsert: { ...content, recipient, dedupeKey: `${content.dedupeKey}:${recipient}` } },
        { upsert: true }
    )));
}
