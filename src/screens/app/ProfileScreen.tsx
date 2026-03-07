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
import { useNavigation } from '@react-navigation/native';
import BottomNav from '../../components/BottomNav';

const ALL_INTERESTS = [
    '🎮 Gaming', '⚽ Football', '🎸 Music', '🎨 Art', '🏋️ Fitness',
    '🍳 Cooking', '📸 Photography', '✈️ Travel', '📚 Reading', '🎬 Movies',
    '🌿 Nature', '🐾 Animals', '🎯 Chess', '🚴 Cycling', '💻 Coding',
    '🧘 Yoga', '🏄 Surfing', '🎲 Board Games', '🌌 Space', '🎭 Theater',
];

export default function ProfileScreen() {
    const { profile, session, signOut } = useAuthStore();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Profile Header */}
                <View style={styles.headerCard}>
                    <Text style={styles.username}>{profile?.username ?? 'Learner'}</Text>
                    <Text style={styles.stats}>⭐ {profile?.total_xp ?? 0} XP   🔥 {profile?.streak_count ?? 0} Day Streak</Text>
                </View>

                {/* AI Prompt (Coming Soon) */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>✨ AI Discover Interests</Text>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>Coming Soon</Text>
                        </View>
                    </View>
                    <Text style={styles.cardDesc}>
                        Prompt our AI to discover new niche interests tailored exactly to your vibe.
                    </Text>
                    <TextInput
                        style={styles.disabledInput}
                        placeholder="e.g. I like solving mysteries and baking..."
                        placeholderTextColor={COLORS.textLight}
                        editable={false}
                    />
                </View>

                {/* Edit Interests */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Your Interests</Text>
                    <Text style={styles.cardDesc}>Pick at least 2 to personalize your knowledge journey.</Text>

                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
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
                <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
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
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textDark, marginBottom: SPACING.xs },
    cardDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textMedium, marginBottom: SPACING.md, lineHeight: 20 },
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
});
