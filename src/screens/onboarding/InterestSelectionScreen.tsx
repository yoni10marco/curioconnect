import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

const ALL_INTERESTS = [
    '🎮 Gaming', '⚽ Football', '🎸 Music', '🎨 Art', '🏋️ Fitness',
    '🍳 Cooking', '📸 Photography', '✈️ Travel', '📚 Reading', '🎬 Movies',
    '🌿 Nature', '🐾 Animals', '🎯 Chess', '🚴 Cycling', '💻 Coding',
    '🧘 Yoga', '🏄 Surfing', '🎲 Board Games', '🌌 Space', '🎭 Theater',
];

export default function InterestSelectionScreen() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const { session, fetchProfile } = useAuthStore();

    const toggle = (interest: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(interest)) next.delete(interest);
            else next.add(interest);
            return next;
        });
    };

    const handleContinue = async () => {
        if (selected.size < 2) {
            Alert.alert('Choose more!', 'Please select at least 2 interests to personalize your lessons.');
            return;
        }
        if (!session) return;

        setSaving(true);
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

        await fetchProfile(session.user.id);
        setSaving(false);
        // Navigation happens automatically via root navigator checking profile interests
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.emoji}>🌟</Text>
                <Text style={styles.title}>What are you into?</Text>
                <Text style={styles.subtitle}>
                    We'll connect your passions to fascinating academic topics daily.
                    {'\n'}
                    <Text style={styles.minText}>Pick at least 2</Text>
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
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
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.countText}>{selected.size} selected</Text>
                <TouchableOpacity
                    style={[styles.continueButton, selected.size < 2 && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={saving || selected.size < 2}
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
    header: {
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
    minText: {
        fontWeight: FONTS.weights.bold,
        color: COLORS.accent,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: SPACING.md,
        paddingBottom: 120,
        gap: SPACING.sm,
        justifyContent: 'center',
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
