import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput
} from 'react-native';
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
    const [ageInput, setAgeInput] = useState(profile?.age?.toString() ?? '');
    const [jobInput, setJobInput] = useState(profile?.job_title ?? '');

    const [difficulty, setDifficulty] = useState(profile?.difficulty_level ?? 'beginner');

    useEffect(() => {
        if (profile) {
            setDifficulty(profile.difficulty_level ?? 'beginner');
            setAgeInput(profile.age?.toString() ?? '');
            setJobInput(profile.job_title ?? '');
        }
    }, [profile]);

    // AI Discovery Fields
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const navigation = useNavigation();

    const scrollRef = React.useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, [])
    );

    const fetchInterests = async () => {
        if (!session) return;
        const { data, error } = await supabase
            .from('user_interests')
            .select('interest_name')
            .eq('user_id', session.user.id);

        if (!error && data) {
            const loaded = new Set(data.map(r => r.interest_name));
            setSelected(loaded);
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
        } else {
            const added: string[] = data?.added ?? [];
            if (added.length > 0) {
                Alert.alert('Interests Added! ✨', `Added: ${added.join(', ')}`);
            } else {
                Alert.alert('No New Interests', 'These interests are already in your profile!');
            }
            setAiPrompt('');
            await fetchInterests();
        }
        setAiLoading(false);
    };

    const handleSave = async () => {
        if (selected.size < 2) {
            Alert.alert('Choose more!', 'Please select at least 2 interests.');
            return;
        }
        if (!session) return;

        setSaving(true);
        // Delete existing interests
        const { error: deleteError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', session.user.id);

        if (deleteError) {
            Alert.alert('Error', 'Failed to update interests.');
            setSaving(false);
            return;
        }

        // Insert new selected
        const rows = Array.from(selected).map((name) => ({
            user_id: session.user.id,
            interest_name: name,
        }));

        const { error: insertError } = await supabase.from('user_interests').insert(rows);

        // Update profile specifics
        const parsedAge = parseInt(ageInput, 10);
        await updateProfile({
            difficulty_level: difficulty,
            age: !isNaN(parsedAge) ? parsedAge : null,
            job_title: jobInput.trim() || null,
        });

        if (insertError) {
            Alert.alert('Error', 'Failed to save new interests.');
        } else {
            Alert.alert('Success', 'Profile updated!');
            navigation.goBack();
        }
        setSaving(false);
    };

    return (
        <View style={styles.container}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                <View style={styles.headerCard}>
                    <Text style={styles.username}>{profile?.username ?? 'Learner'}</Text>
                    <Text style={styles.stats}>⭐ {profile?.total_xp ?? 0} XP   🔥 {profile?.streak_count ?? 0} Day Streak</Text>
                </View>

                {/* Edit Personal Details */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Personal Details</Text>
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

                    <Text style={[styles.cardTitle, { marginTop: SPACING.md, marginBottom: SPACING.sm }]}>📚 Lesson Difficulty</Text>
                    <View style={styles.levelContainer}>
                        {[
                            { id: 'child', label: '🧒 Child', desc: 'Simple' },
                            { id: 'beginner', label: '🎓 High School', desc: 'Beginner' },
                            { id: 'intermediate', label: '🏛️ College', desc: 'Intermediate' },
                            { id: 'advanced', label: '🧠 Expert', desc: 'Advanced' },
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
                    <Text style={styles.cardTitle}>✨ AI Discover Interests</Text>
                    <Text style={styles.cardDesc}>
                        Prompt our AI to read your sentence and map it to core interests that we can teach you about!
                    </Text>
                    <View style={styles.aiInputRow}>
                        <TextInput
                            style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
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
                                <Text style={styles.aiBtnText}>Discover</Text>
                            )}
                        </TouchableOpacity>
                    </View>
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
                                        <Text style={styles.cardSubtitle}>✨ AI Discovered</Text>
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
    comingSoonBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
    comingSoonText: { color: '#F57C00', fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, textTransform: 'uppercase' },
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
    aiInputRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    aiBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.lg,
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
