import { supabase } from './supabase';
import { Topic, DailyLesson, QueuedLesson } from './types';

const QUEUE_TARGET = 25;
const REFILL_THRESHOLD = 5;

/**
 * Build round-robin topic+interest pairs for batch generation.
 */
export function buildLessonPairs(
    interests: string[],
    topics: Topic[],
    count: number = QUEUE_TARGET
): { topic_name: string; interest_name: string }[] {
    if (interests.length === 0 || topics.length === 0) return [];

    const pairs: { topic_name: string; interest_name: string }[] = [];
    for (let i = 0; i < count; i++) {
        const interest = interests[i % interests.length];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        pairs.push({ topic_name: topic.name, interest_name: interest });
    }
    return pairs;
}

/**
 * Consume the next lesson from the queue: insert into daily_lessons, delete from queue.
 * Returns the created DailyLesson or null if queue is empty.
 */
export async function consumeFromQueue(
    userId: string,
    todayStr: string
): Promise<DailyLesson | null> {
    // Get the next queued lesson (lowest queue_position)
    const { data: queued, error: fetchErr } = await supabase
        .from('lesson_queue')
        .select('*')
        .eq('user_id', userId)
        .order('queue_position', { ascending: true })
        .limit(1)
        .single();

    if (fetchErr || !queued) return null;

    const queuedLesson = queued as QueuedLesson;

    // Insert into daily_lessons with today's date
    // quiz_data is already in pages format [{text, questions}, ...] from batch generation
    const { data: inserted, error: insertErr } = await supabase
        .from('daily_lessons')
        .insert({
            user_id: userId,
            title: queuedLesson.title,
            content_markdown: queuedLesson.content_markdown,
            quiz_data: queuedLesson.quiz_data,
            interest_name: queuedLesson.interest_name,
            is_completed: false,
            created_at: todayStr,
        })
        .select()
        .single();

    if (insertErr || !inserted) return null;

    // Delete from queue
    await supabase.from('lesson_queue').delete().eq('id', queuedLesson.id);

    return inserted as DailyLesson;
}

/**
 * Get the current queue size for a user.
 */
export async function getQueueSize(userId: string): Promise<number> {
    const { count } = await supabase
        .from('lesson_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    return count ?? 0;
}

/**
 * Fire-and-forget: trigger batch generation if queue is below threshold.
 */
export async function triggerRefillIfNeeded(
    accessToken: string,
    userId: string,
    difficultyLevel: string
): Promise<void> {
    const size = await getQueueSize(userId);
    if (size >= REFILL_THRESHOLD) return;

    // Fetch interests and topics
    const [{ data: interests }, { data: topics }] = await Promise.all([
        supabase.from('user_interests').select('interest_name').eq('user_id', userId),
        supabase.from('topics').select('name'),
    ]);

    const interestNames = (interests ?? []).map((r: { interest_name: string }) => r.interest_name);
    const topicNames = (topics ?? []).map((t: { name: string }) => ({ name: t.name, id: '', category: '' }));

    if (interestNames.length === 0 || topicNames.length === 0) return;

    const toGenerate = QUEUE_TARGET - size;
    const pairs = buildLessonPairs(interestNames, topicNames, toGenerate);

    // Fire and forget — don't await
    supabase.functions.invoke('generate-lesson-batch', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
            lessons: pairs,
            difficulty_level: difficultyLevel,
        },
    });
}

export { QUEUE_TARGET, REFILL_THRESHOLD };
