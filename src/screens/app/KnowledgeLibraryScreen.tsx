import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';

type LessonSummary = {
    id: string;
    title: string;
    created_at: string;
};

export default function KnowledgeLibraryScreen() {
    const { session } = useAuthStore();
    const [lessons, setLessons] = useState<LessonSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        if (!session) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('daily_lessons')
            .select('id, title, created_at')
            .eq('user_id', session.user.id)
            .eq('is_completed', true)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLessons(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    const renderItem = ({ item }: { item: LessonSummary }) => {
        const dateString = new Date(item.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return (
            <View style={styles.card}>
                <Text style={styles.lessonTitle}>{item.title}</Text>
                <Text style={styles.lessonDate}>{dateString}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Knowledge Library</Text>
                <Text style={styles.headerSubtitle}>
                    All the amazing modules you've completed. Keep exploring!
                </Text>
            </View>

            {lessons.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text style={styles.emptyTitle}>Your library is empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Complete daily lessons to build your knowledge library.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={lessons}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
    },
    listContent: {
        padding: SPACING.md,
        gap: SPACING.sm,
    },
    card: {
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    lessonTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: 4,
    },
    lessonDate: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    emptySubtitle: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
    },
});
