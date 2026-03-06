import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { ALL_INTERESTS } from '../../lib/constants';

export default function ProfileScreen() {
    const { session, profile, fetchProfile, signOut } = useAuthStore();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadInterests();
    }, []);

    const loadInterests = async () => {
        if (!session) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('user_interests')
            .select('interest_name')
            .eq('user_id', session.user.id);

        if (!error && data) {
            const currentSelected = new Set<string>();
            data.forEach((row) => currentSelected.add(row.interest_name));
            setSelected(currentSelected);
        }
        setLoading(false);
    };

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
            Alert.alert('Choose more!', 'Please select at least 2 interests to personalize your lessons.');
            return;
        }
        if (!session) return;

        setSaving(true);
        // First delete old interests
        const { error: deleteError } = await supabase
            .from('user_interests')
            .delete()
            .eq('user_id', session.user.id);

        if (deleteError) {
            Alert.alert('Error', 'Failed to clear old interests. Please try again.');
            setSaving(false);
            return;
        }

        // Insert new ones
        const rows = Array.from(selected).map((name) => ({
            user_id: session.user.id,
            interest_name: name,
        }));

        const { error: insertError } = await supabase.from('user_interests').insert(rows);
        if (insertError) {
            Alert.alert('Error', 'Failed to save interests. Please try again.');
            setSaving(false);
            return;
        }

        Alert.alert('Success', 'Your interests have been updated!');
        await fetchProfile(session.user.id);
        setSaving(false);
    };

    const handleComingSoonAI = () => {
        Alert.alert('Coming Soon!', 'Using AI to detect your interests will be available in a future update.');
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{profile?.username?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <Text style={styles.username}>{profile?.username}</Text>

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>🔥</Text>
                        <Text style={styles.statValue}>{profile?.streak_count || 0}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statEmoji}>⭐</Text>
                        <Text style={styles.statValue}>{profile?.total_xp || 0}</Text>
                        <Text style={styles.statLabel}>Total XP</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Your Interests</Text>
                    <Text style={styles.sectionSubtitle}>Pick at least 2 to personalize your learning.</Text>
                </View>

                <TouchableOpacity
                    style={styles.aiButton}
                    onPress={handleComingSoonAI}
                    activeOpacity={0.8}
                >
                    <Ionicons name="sparkles" size={20} color={COLORS.white} />
                    <Text style={styles.aiButtonText}>AI Interest Discovery (Coming Soon)</Text>
                </TouchableOpacity>

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

                <TouchableOpacity
                    style={[styles.saveButton, selected.size < 2 && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving || selected.size < 2}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    content: { paddingBottom: SPACING.xxl },
    header: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: FONTS.weights.bold,
        color: COLORS.white,
    },
    username: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.lg,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.lg,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        minWidth: 100,
    },
    statEmoji: { fontSize: 24, marginBottom: 4 },
    statValue: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    statLabel: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textMedium,
        textTransform: 'uppercase',
    },
    section: {
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        marginTop: SPACING.md,
    },
    sectionHeader: { marginBottom: SPACING.md },
    sectionTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    sectionSubtitle: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        marginTop: 4,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#9C27B0', // Purple for AI
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    aiButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    chip: {
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    chipSelected: {
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}18`,
    },
    chipText: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        fontWeight: FONTS.weights.medium,
    },
    chipTextSelected: {
        color: COLORS.primaryDark,
        fontWeight: FONTS.weights.bold,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: COLORS.textLight,
        opacity: 0.7,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
    footer: {
        padding: SPACING.lg,
        alignItems: 'center',
    },
    logoutButton: {
        padding: SPACING.md,
    },
    logoutText: {
        color: '#D32F2F',
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
});
