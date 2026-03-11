import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { buildLessonPairs } from '../../lib/lessonQueue';
import { Topic } from '../../lib/types';

const ALL_INTERESTS = [
    '🎮 Gaming', '⚽ Football', '🎸 Music', '🎨 Art', '🏋️ Fitness',
    '🍳 Cooking', '📸 Photography', '✈️ Travel', '📚 Reading', '🎬 Movies',
    '🌿 Nature', '🐾 Animals', '🎯 Chess', '🚴 Cycling', '💻 Coding',
    '🧘 Yoga', '🏄 Surfing', '🎲 Board Games', '🌌 Space', '🎭 Theater',
];

const LEVELS = [
    { id: 'child', label: '🧒 Child', desc: 'Simple & Fun' },
    { id: 'beginner', label: '🎓 High Schooler', desc: 'Beginner' },
    { id: 'intermediate', label: '🏛️ College', desc: 'Intermediate' },
    { id: 'advanced', label: '🧠 Expert', desc: 'Advanced' },
];

export default function InterestSelectionScreen() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [referralInput, setReferralInput] = useState('');
    const [ageInput, setAgeInput] = useState('');
    const [jobInput, setJobInput] = useState('');
    const [difficulty, setDifficulty] = useState('beginner');
    const { session, profile, fetchProfile, updateProfile } = useAuthStore();

    useEffect(() => {
        if (profile?.username) setUsernameInput(profile.username);
    }, [profile?.username]);

    const toggle = (interest: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(interest)) next.delete(interest);
            else next.add(interest);
            return next;
        });
    };

    const handleContinue = async () => {
        if (!usernameInput.trim()) {
            Alert.alert('Username required', 'Please enter a username to continue.');
            return;
        }
        if (selected.size < 2) {
            Alert.alert('Choose more!', 'Please select at least 2 interests to personalize your lessons.');
            return;
        }
        if (!session) return;

        setSaving(true);

        // Apply referral code if provided and not already applied
        if (referralInput.trim() && !profile?.referred_by_user_id) {
            try {
                const { data: rpcData } = await supabase.rpc('get_user_by_referral_code', { code: referralInput.trim() });
                if (typeof rpcData === 'string' && rpcData !== session.user.id) {
                    await supabase.from('profiles').update({ referred_by_user_id: rpcData }).eq('id', session.user.id);
                }
            } catch { }
        }

        // Save interests
        const rows = Array.from(selected).map((name) => ({
            user_id: session.user.id,
            interest_name: name,
        }));
        const { error } = await supabase.from('user_interests').insert(rows);
        if (error) {
            Alert.alert('Error', 'Failed to save interests. Please try again.');
            setSaving(false);
            return;
        }

        // Save profile fields
        const parsedAge = parseInt(ageInput, 10);
        await updateProfile({
            username: usernameInput.trim(),
            difficulty_level: difficulty,
            ...(ageInput && !isNaN(parsedAge) && { age: parsedAge }),
            ...(jobInput.trim() && { job_title: jobInput.trim() }),
        });

        // Fire-and-forget: pre-generate lesson queue for this user
        (async () => {
            try {
                const { data: allTopics } = await supabase.from('topics').select('id, name, category');
                const topics = (allTopics ?? []) as Topic[];
                const interestNames = Array.from(selected);
                const pairs = buildLessonPairs(interestNames, topics);

                if (pairs.length > 0) {
                    supabase.functions.invoke('generate-lesson-batch', {
                        body: {
                            lessons: pairs,
                            difficulty_level: difficulty,
                        },
                    });
                }
            } catch {
                // Silent — queue generation is best-effort
            }
        })();

        await fetchProfile(session.user.id);
        setSaving(false);
        // Navigation happens automatically via root navigator checking profile interests
    };

    const canContinue = selected.size >= 2 && usernameInput.trim().length > 0;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Hero */}
                <View style={styles.hero}>
                    <Text style={styles.emoji}>🌟</Text>
                    <Text style={styles.title}>Set up your profile</Text>
                    <Text style={styles.subtitle}>
                        Tell us about yourself so we can personalize your learning experience.
                    </Text>
                </View>

                {/* Username */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>👤 Username</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Choose a username"
                        placeholderTextColor={COLORS.textLight}
                        value={usernameInput}
                        onChangeText={setUsernameInput}
                        autoCapitalize="none"
                    />
                </View>

                {/* Referral code */}
                {!profile?.referred_by_user_id && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🎁 Invite Code</Text>
                        <Text style={styles.cardDesc}>Got an invite code from a friend? Enter it here.</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Enter invite code (optional)"
                            placeholderTextColor={COLORS.textLight}
                            value={referralInput}
                            onChangeText={setReferralInput}
                            autoCapitalize="characters"
                        />
                    </View>
                )}

                {/* Level */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📚 I am a...</Text>
                    <View style={styles.levelContainer}>
                        {LEVELS.map(l => (
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

                {/* About you */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🙋 About You <Text style={styles.optional}>(Optional)</Text></Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Age (e.g., 25)"
                        placeholderTextColor={COLORS.textLight}
                        keyboardType="numeric"
                        value={ageInput}
                        onChangeText={setAgeInput}
                    />
                    <TextInput
                        style={[styles.textInput, { marginBottom: 0 }]}
                        placeholder="What do you do? (e.g., Student, Engineer)"
                        placeholderTextColor={COLORS.textLight}
                        value={jobInput}
                        onChangeText={setJobInput}
                    />
                </View>

                {/* Interests */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>❤️ Your Interests</Text>
                    <Text style={styles.cardDesc}>Pick at least 2 to personalize your lessons.</Text>
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
                </View>

                {/* Bottom padding for fixed footer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed footer */}
            <View style={styles.footer}>
                <Text style={styles.countText}>{selected.size} selected</Text>
                <TouchableOpacity
                    style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={saving || !canContinue}
                    activeOpacity={0.85}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.continueButtonText}>Continue →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        gap: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    hero: {
        backgroundColor: COLORS.primary,
        paddingTop: 60,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    emoji: { fontSize: 48, marginBottom: SPACING.sm },
    title: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.white,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONTS.sizes.md,
        color: 'rgba(255,255,255,0.85)',
        marginTop: SPACING.sm,
        textAlign: 'center',
        lineHeight: 22,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginHorizontal: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    cardDesc: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        marginBottom: SPACING.md,
        lineHeight: 20,
    },
    optional: {
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.regular,
        color: COLORS.textLight,
    },
    textInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        color: COLORS.textDark,
        fontSize: FONTS.sizes.md,
        marginBottom: SPACING.sm,
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
        borderColor: COLORS.primary,
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    chip: {
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
    },
    chipSelected: {
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}18`,
    },
    chipText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        fontWeight: FONTS.weights.medium,
    },
    chipTextSelected: {
        color: COLORS.primaryDark,
        fontWeight: FONTS.weights.bold,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    countText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        fontWeight: FONTS.weights.medium,
        flex: 1,
    },
    continueButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    continueButtonDisabled: {
        backgroundColor: COLORS.textLight,
        shadowOpacity: 0,
        elevation: 0,
    },
    continueButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
});
