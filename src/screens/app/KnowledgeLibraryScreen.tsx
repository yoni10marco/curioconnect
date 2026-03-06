import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { DailyLesson } from '../../lib/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LibraryLesson = DailyLesson & { topics?: { name: string } };

export default function KnowledgeLibraryScreen() {
    const { session } = useAuthStore();
    const [lessons, setLessons] = useState<LibraryLesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLessons = async () => {
            if (!session) return;
            const { data } = await supabase
                .from('daily_lessons')
                .select('*, topics(name)')
                .eq('user_id', session.user.id)
                .eq('is_completed', true)
                .order('created_at', { ascending: false });

            setLessons(data as any || []);
            setLoading(false);
        };
        fetchLessons();
    }, [session]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Knowledge Library</Text>
                <Text style={styles.subtitle}>Review all the lessons you've conquered.</Text>
            </View>

            <FlatList
                data={lessons}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listPad}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="book-open-blank-variant" size={64} color={COLORS.border} />
                        <Text style={styles.emptyTitle}>Your library is empty</Text>
                        <Text style={styles.emptyDesc}>Complete a daily mission to add your first book to the shelf!</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
                        <View style={styles.cardIcon}>
                            <MaterialCommunityIcons name="check-decagram" size={24} color={COLORS.primary} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTopicBadge}>{item.topics?.name || 'Topic'}</Text>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardDate}>
                                {new Date(item.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
    header: {
        padding: SPACING.xl,
        paddingTop: SPACING.xxl,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.heavy, color: COLORS.textDark, marginBottom: 4 },
    subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textMedium },
    listPad: { padding: SPACING.lg, paddingBottom: 100 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
        shadowColor: COLORS.textDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    cardContent: { flex: 1 },
    cardTopicBadge: {
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.bold,
        color: COLORS.primaryDark,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    cardTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: 4,
    },
    cardDate: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        marginTop: SPACING.xxl,
    },
    emptyTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    emptyDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
    }
});
