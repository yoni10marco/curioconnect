export type Profile = {
    id: string;
    username: string | null;
    total_xp: number;
    streak_count: number;
    last_lesson_date: string | null;
    difficulty_level: string;
    created_at: string;
    age?: number | null;
    job_title?: string | null;
    streak_freeze_count: number;
    admin_role?: 'full_admin' | 'read_only_admin' | null;
    discover_weekly_limit?: number;
    discover_week_start?: string | null;
    discover_week_count?: number;
    referral_code?: string;
    referred_by_user_id?: string | null;
    referral_reward_given?: boolean;
    last_difficulty_change?: string | null;
    last_interest_change?: string | null;
    bonus_lesson_date?: string | null;
};

export type UserInterest = {
    id: string;
    user_id: string;
    interest_name: string;
};

export type Topic = {
    id: string;
    name: string;
    category: string;
};

export type QuizQuestion = {
    q: string;
    options: string[];
    answer_idx: number;
};

export type PageData = {
    text: string;
    questions: QuizQuestion[];
};

export type DailyLesson = {
    id: string;
    user_id: string;
    topic_id: string | null;
    title: string;
    content_markdown: string;
    quiz_data: PageData[];
    is_completed: boolean;
    created_at: string;
};

export type NewsMessage = {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_read?: boolean; // computed from client joined query
};

export type Feedback = {
    id: string;
    user_id: string | null;
    content: string;
    created_at: string;
};

export type QueuedLesson = {
    id: string;
    user_id: string;
    topic_name: string;
    interest_name: string;
    title: string;
    content_markdown: string;
    quiz_data: PageData[];
    generated_at: string;
    queue_position: number;
};
