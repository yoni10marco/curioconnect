import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useLessonStore } from '../../store/useLessonStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import BottomNav from '../../components/BottomNav';

const ALL_INTERESTS = [
    '🎮 Gaming', '⚽ Football', '🎸 Music', '🎨 Art', '🏋️ Fitness',
    '🍳 Cooking', '📸 Photography', '✈️ Travel', '📚 Reading', '🎬 Movies',
    '🌿 Nature', '🐾 Animals', '🎯 Chess', '🚴 Cycling', '💻 Coding',
    '🧘 Yoga', '🏄 Surfing', '🎲 Board Games', '🌌 Space', '🎭 Theater',
];

export default function ProfileScreen() {
    const { profile, session, signOut, updateProfile } = useAuthStore();
    const { resetLesson } = useLessonStore();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable Profile Fields
    const [usernameInput, setUsernameInput] = useState(profile?.username ?? '');
    const [ageInput, setAgeInput] = useState(profile?.age?.toString() ?? '');
    const [jobInput, setJobInput] = useState(profile?.job_title ?? '');

    const [difficulty, setDifficulty] = useState(profile?.difficulty_level ?? 'beginner');

    // Track initial state for diff computation on save
    const initialInterestsRef = useRef<Set<string>>(new Set());
    const initialDifficultyRef = useRef<string>(profile?.difficulty_level ?? 'beginner');

    useEffect(() => {
        if (profile) {
            setUsernameInput(profile.username ?? '');
            setDifficulty(profile.difficulty_level ?? 'beginner');
            initialDifficultyRef.current = profile.difficulty_level ?? 'beginner';
            setAgeInput(profile.age?.toString() ?? '');
            setJobInput(profile.job_title ?? '');
        }
    }, [profile]);

    // AI Discovery Fields
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [discoverUsed, setDiscoverUsed] = useState(0);
    const [discoverLimit, setDiscoverLimit] = useState(1);

    const navigation = useNavigation();

    const scrollRef = React.useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, [])
    );

    const fetchInterests = async () => {
        if (!session) return;
        const [{ data: interestData }, { data: profileData }] = await Promise.all([
            supabase.from('user_interests').select('interest_name').eq('user_id', session.user.id),
            supabase.from('profiles').select('discover_weekly_limit, discover_week_start, discover_week_count').eq('id', session.user.id).single(),
        ]);

        if (interestData) {
            const interestSet = new Set(interestData.map(r => r.interest_name));
            setSelected(interestSet);
            initialInterestsRef.current = new Set(interestSet);
        }

        if (profileData) {
            const limit = profileData.discover_weekly_limit ?? 1;
            const weekStart = profileData.discover_week_start ?? null;
            const count = profileData.discover_week_count ?? 0;
            const _d2 = new Date();
            const today = `${_d2.getFullYear()}-${String(_d2.getMonth() + 1).padStart(2, '0')}-${String(_d2.getDate()).padStart(2, '0')}`;
            const isNewWeek = !weekStart ||
                (new Date(today).getTime() - new Date(weekStart).getTime()) >= 7 * 24 * 60 * 60 * 1000;
            setDiscoverLimit(limit);
            setDiscoverUsed(isNewWeek ? 0 : count);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchInterests();
    }, [session]);

    const toggle = (interest: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(interest)) next.delete(interest);
            else next.add(interest);
            return next;
        });
    };

    const handleAskAI = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);

        const { data, error } = await supabase.functions.invoke('discover-interests', {
            body: { prompt: aiPrompt.trim() },
        });

        if (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to discover interests.');
        } else if (data?.error === 'inappropriate_content') {
            Alert.alert('Inappropriate Content', 'Please keep your description appropriate for all ages.');
        } else if (data?.error === 'weekly_limit_reached') {
            Alert.alert('Weekly Limit Reached', `You can only use AI Discover ${data?.limit ?? 1} time(s) per week. Come back next week!`);
        } else if (data?.error === 'interest_limit_reached') {
            Alert.alert('Interest Limit Reached', 'You can have at most 25 interests. Remove some before discovering new ones.');
        } else {
            const added: string[] = data?.added ?? [];
            if (added.length > 0) {
                Alert.alert('Interests Added! ✨', `Added: ${added.join(', ')}`);

                // Fire-and-forget: sync queue with newly discovered interests
                if (session) {
                    supabase.functions.invoke('sync-lesson-queue', {
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: {
                            removed_interests: [],
                            added_interests: added,
                            all_interests: [...Array.from(selected), ...added],
                            difficulty_level: profile?.difficulty_level ?? 'adult',
                            difficulty_changed: false,
                        },
                    }).catch(() => {});
                }
            } else {
                Alert.alert('No New Interests', 'These interests are already in your profile!');
            }
            setAiPrompt('');
        }
        // Always refresh usage count after any attempt (failed calls also count)
        await fetchInterests();
        setAiLoading(false);
    };

    const handleSave = async () => {
        if (!usernameInput.trim()) {
            Alert.alert('Username required', 'Please enter a username.');
            return;
        }
        if (selected.size < 2) {
            Alert.alert('Choose more!', 'Please select at least 2 interests.');
            return;
        }
        if (!session) return;

        // Check difficulty change weekly limit
        const difficultyChanged = difficulty !== initialDifficultyRef.current;
        if (difficultyChanged && profile?.last_difficulty_change) {
            const lastChange = new Date(profile.last_difficulty_change);
            const now = new Date();
            const daysSince = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince < 7) {
                const nextDate = new Date(lastChange);
                nextDate.setDate(nextDate.getDate() + 7);
                const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
                Alert.alert('Difficulty Locked', `You can change difficulty again on ${nextStr}.`);
                setDifficulty(initialDifficultyRef.current);
                return;
            }
        }

        // Check interest change weekly limit
        const oldInterestsForCheck = initialInterestsRef.current;
        const interestsChanged = [...oldInterestsForCheck].some(i => !selected.has(i)) || [...selected].some(i => !oldInterestsForCheck.has(i));
        if (interestsChanged && profile?.last_interest_change) {
            const lastChange = new Date(profile.last_interest_change);
            const now = new Date();
            const daysSince = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince < 7) {
                const nextDate = new Date(lastChange);
                nextDate.setDate(nextDate.getDate() + 7);
                const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
                Alert.alert('Interests Locked', `You can change interests again on ${nextStr}.`);
                setSelected(new Set(oldInterestsForCheck));
                return;
            }
        }

        setSaving(true);
        // Atomically delete + re-insert interests in a single transaction
        const { error: interestError } = await supabase.rpc('save_user_interests', {
            p_user_id: session.user.id,
            p_interests: Array.from(selected),
        });

        if (interestError) {
            Alert.alert('Error', 'Failed to update interests.');
            setSaving(false);
            return;
        }

        // Update profile specifics (include last_difficulty_change if changed)
        const parsedAge = parseInt(ageInput, 10);
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        await updateProfile({
            username: usernameInput.trim(),
            difficulty_level: difficulty,
            age: !isNaN(parsedAge) ? parsedAge : null,
            job_title: jobInput.trim() || null,
            ...(difficultyChanged && { last_difficulty_change: todayStr }),
            ...(interestsChanged && { last_interest_change: todayStr }),
        });

        // Sync lesson queue: compute interest diff and trigger sync
        const oldInterests = initialInterestsRef.current;
        const removedInterests = [...oldInterests].filter(i => !selected.has(i));
        const addedInterests = [...selected].filter(i => !oldInterests.has(i));

        if (difficultyChanged || removedInterests.length > 0 || addedInterests.length > 0) {
            // Fire-and-forget sync
            supabase.functions.invoke('sync-lesson-queue', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: {
                    removed_interests: removedInterests,
                    added_interests: addedInterests,
                    all_interests: Array.from(selected),
                    difficulty_level: difficulty,
                    difficulty_changed: difficultyChanged,
                },
            }).catch(() => {});
        }

        // Update refs for next save
        initialInterestsRef.current = new Set(selected);
        initialDifficultyRef.current = difficulty;

        Alert.alert('Success', 'Profile updated!');
        navigation.goBack();
        setSaving(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                <View style={styles.headerCard}>
                    <Text style={styles.username}>{profile?.username ?? 'Learner'}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItemRow}>
                            <Ionicons name="star" size={16} color={COLORS.xp} />
                            <Text style={styles.statItem}> {profile?.total_xp ?? 0} XP</Text>
                        </View>
                        <View style={styles.statItemRow}>
                            <Ionicons name="flame" size={16} color={COLORS.streak} />
                            <Text style={styles.statItem}> {profile?.streak_count ?? 0} Day Streak</Text>
                        </View>
                        <View style={styles.statItemRow}>
                            <Ionicons name="snow" size={16} color={COLORS.primaryLight} />
                            <Text style={styles.statItem}> {profile?.streak_freeze_count ?? 0} Freeze</Text>
                        </View>
                    </View>
                </View>

                {/* Edit Personal Details */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Personal Details</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Username"
                        placeholderTextColor={COLORS.textLight}
                        value={usernameInput}
                        onChangeText={setUsernameInput}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Age"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="numeric"
                        value={ageInput}
                        onChangeText={setAgeInput}
                    />
                    <TextInput
                        style={styles.textInput}
                        placeholder="What do you do for a living?"
                        placeholderTextColor={COLORS.textLight}
                        value={jobInput}
                        onChangeText={setJobInput}
                    />

                    <View style={[styles.cardTitleRow, { marginTop: SPACING.md, marginBottom: SPACING.sm }]}>
                        <Ionicons name="book" size={18} color={COLORS.primary} />
                        <Text style={styles.cardTitle}> Lesson Difficulty</Text>
                    </View>
                    <View style={styles.levelContainer}>
                        {[
                            { id: 'child', label: 'Child', desc: 'Simple' },
                            { id: 'beginner', label: 'High School', desc: 'Beginner' },
                            { id: 'intermediate', label: 'College', desc: 'Intermediate' },
                            { id: 'advanced', label: 'Expert', desc: 'Advanced' },
                        ].map(l => (
                            <TouchableOpacity
                                key={l.id}
                                style={[styles.levelBtn, difficulty === l.id && styles.levelBtnActive]}
                                onPress={() => setDifficulty(l.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.levelLabel, difficulty === l.id && styles.levelLabelActive]}>{l.label}</Text>
                                <Text style={[styles.levelDesc, difficulty === l.id && styles.levelDescActive]}>{l.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* AI Prompt */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="sparkles" size={18} color={COLORS.xp} />
                            <Text style={styles.cardTitle}> AI Discover Interests</Text>
                        </View>
                        <Text style={[styles.cardDesc, { marginBottom: 0, fontWeight: FONTS.weights.bold, color: discoverUsed >= discoverLimit ? COLORS.danger : COLORS.textMedium }]}>
                            {discoverLimit - discoverUsed} / {discoverLimit} left
                        </Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Prompt our AI to read your sentence and map it to core interests that we can teach you about!
                    </Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. I like solving mysteries..."
                        placeholderTextColor={COLORS.textLight}
                        value={aiPrompt}
                        onChangeText={setAiPrompt}
                    />
                    <TouchableOpacity
                        style={styles.aiBtn}
                        onPress={handleAskAI}
                        disabled={aiLoading || !aiPrompt.trim()}
                        activeOpacity={0.8}
                    >
                        {aiLoading ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.aiBtnText}>Discover Interests</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Edit Interests */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Interests</Text>
                    <Text style={styles.cardDesc}>Pick at least 2 to personalize your knowledge journey.</Text>

                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <>
                            <View style={styles.grid}>
                                {ALL_INTERESTS.map((interest) => {
                                    const isSelected = selected.has(interest);
                                    return (
                                        <TouchableOpacity
                                            key={interest}
                                            style={[styles.chip, isSelected && styles.chipSelected]}
                                            onPress={() => toggle(interest)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                {interest}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {(() => {
                                const customInterests = Array.from(selected).filter(i => !ALL_INTERESTS.includes(i));
                                if (customInterests.length === 0) return null;
                                return (
                                    <>
                                        <Text style={styles.cardSubtitle}>AI Discovered</Text>
                                        <View style={styles.grid}>
                                            {customInterests.map((interest) => (
                                                <TouchableOpacity
                                                    key={interest}
                                                    style={[styles.chip, styles.chipSelected]}
                                                    onPress={() => toggle(interest)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.chipTextSelected}>{interest} ×</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, selected.size < 2 && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving || selected.size < 2 || loading}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>

                {/* Refer a Friend */}
                {profile?.referral_code && (
                    <View style={styles.card}>
                        <View style={styles.cardTitleRow}>
                            <Ionicons name="gift" size={18} color={COLORS.accent} />
                            <Text style={styles.cardTitle}> Invite a Friend</Text>
                        </View>
                        <Text style={styles.cardDesc}>
                            Share your code — when a friend signs up and completes their first lesson, you both get +100 XP and +1 streak freeze!
                        </Text>
                        <View style={styles.referralRow}>
                            <Text style={styles.referralCode}>{profile.referral_code}</Text>
                            <TouchableOpacity
                                style={styles.copyBtn}
                                onPress={() => {
                                    Clipboard.setString(profile.referral_code!);
                                    Alert.alert('Copied!', 'Referral code copied to clipboard.');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.copyBtnText}>Copy</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Logout */}
                <TouchableOpacity onPress={() => { signOut(); resetLesson(); }} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
            <BottomNav currentRoute="Profile" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: SPACING.lg, paddingBottom: 60, gap: SPACING.lg },
    headerCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    username: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textDark, marginBottom: 4 },
    stats: { fontSize: FONTS.sizes.md, color: COLORS.textMedium, fontWeight: FONTS.weights.medium },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.sm, marginTop: 4 },
    statItemRow: { flexDirection: 'row', alignItems: 'center' },
    statItem: { fontSize: FONTS.sizes.md, color: COLORS.textMedium, fontWeight: FONTS.weights.medium },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
    bioText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: FONTS.weights.bold, marginTop: 4 },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textDark, marginBottom: SPACING.xs },
    cardDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textMedium, marginBottom: SPACING.md, lineHeight: 20 },
    cardSubtitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textMedium, marginTop: SPACING.md, marginBottom: SPACING.sm },
    comingSoonBadge: { backgroundColor: '#E8F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
    comingSoonText: { color: '#0088CC', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, textTransform: 'uppercase' },
    disabledInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
    },
    textInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        marginBottom: SPACING.md,
    },
    aiBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBtnText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    chip: {
        borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: COLORS.white,
    },
    chipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
    chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textMedium, fontWeight: FONTS.weights.medium },
    chipTextSelected: { color: COLORS.primaryDark, fontWeight: FONTS.weights.bold },
    saveButton: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveButtonDisabled: { backgroundColor: COLORS.textLight, shadowOpacity: 0, elevation: 0 },
    saveButtonText: { color: COLORS.white, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
    logoutButton: { alignItems: 'center', padding: SPACING.md, marginTop: SPACING.sm },
    logoutText: { color: '#D32F2F', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
    referralRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        gap: SPACING.sm,
    },
    referralCode: {
        flex: 1,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        letterSpacing: 2,
    },
    copyBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    copyBtnText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
    },
    levelContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    levelBtn: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    levelBtnActive: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.accent,
    },
    levelLabel: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        fontWeight: FONTS.weights.bold,
        marginBottom: 2,
    },
    levelLabelActive: {
        color: COLORS.primaryDark,
    },
    levelDesc: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textLight,
    },
    levelDescActive: {
        color: COLORS.textMedium,
    },
});
