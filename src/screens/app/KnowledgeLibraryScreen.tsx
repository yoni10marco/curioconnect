import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { DailyLesson } from '../../lib/types';
import BottomNav from '../../components/BottomNav';

export default function KnowledgeLibraryScreen() {
    const navigation = useNavigation();
    const { session, profile } = useAuthStore();
    const [lessons, setLessons] = useState<DailyLesson[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKnowledge = async () => {
            if (!session) return;
            // Fetch all completed lessons for this user, ordered by date
            const { data, error } = await supabase
                .from('daily_lessons')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('is_completed', true)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setLessons(data as DailyLesson[]);
            }
            setLoading(false);
        };
        fetchKnowledge();
    }, [session]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Knowledge Library</Text>
                <Text style={styles.headerSubtitle}>
                    {lessons.length} topics mastered
                </Text>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : lessons.length === 0 ? (
                <View style={styles.centerBox}>
                    <Text style={styles.emptyEmoji}>📚</Text>
                    <Text style={styles.emptyTitle}>Your library is empty</Text>
                    <Text style={styles.emptyDesc}>
                        Complete your daily missions to build up your knowledge base.
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {lessons.map((lesson) => (
                        <View key={lesson.id} style={styles.lessonCard}>
                            <View style={styles.lessonIconBox}>
                                <Text style={styles.lessonIcon}>🏆</Text>
                            </View>
                            <View style={styles.lessonInfo}>
                                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                                <Text style={styles.lessonDate}>
                                    {new Date(lesson.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.xpBadge}>
                                <Text style={styles.xpText}>+50 XP</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
            <BottomNav currentRoute="KnowledgeLibrary" />
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
    headerTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.white,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: FONTS.sizes.md,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: FONTS.weights.medium,
    },
    centerBox: {
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
    emptyDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
    },
    listContent: {
        padding: SPACING.lg,
        paddingBottom: 60,
        gap: SPACING.md,
    },
    lessonCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    lessonIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    lessonIcon: {
        fontSize: 24,
    },
    lessonInfo: {
        flex: 1,
    },
    lessonTitle: {
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: 4,
    },
    lessonDate: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textMedium,
    },
    xpBadge: {
        backgroundColor: '#E8F5E9', // Light green
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    xpText: {
        color: '#2E7D32', // Dark green
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.bold,
    },
});
