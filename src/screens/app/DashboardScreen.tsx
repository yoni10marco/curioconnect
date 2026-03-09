import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    Alert,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useLessonStore } from '../../store/useLessonStore';
import { AppStackParamList } from '../../navigation';
import { APP_VERSION } from '../../lib/version';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../lib/supabase';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
    const navigation = useNavigation<Nav>();
    const { profile, session, checkAndResetStreak } = useAuthStore();
    const { fetchOrGenerateLesson, loading, lesson, resetLesson, checkTodayLesson } = useLessonStore();

    const [unreadNews, setUnreadNews] = useState(0);

    const scrollRef = useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            checkAndResetStreak();
            checkTodayLesson();

            const fetchUnreadNews = async () => {
                if (!session) return;
                const { count: totalNews } = await supabase.from('news_messages').select('*', { count: 'exact', head: true });
                const { count: readNews } = await supabase.from('user_news_reads').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
                setUnreadNews(Math.max(0, (totalNews || 0) - (readNews || 0)));
            };
            fetchUnreadNews();
        }, [session])
    );

    // Streak fire pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        const glow = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
            ])
        );
        if ((profile?.streak_count ?? 0) > 0) {
            pulse.start();
            glow.start();
        }
        return () => { pulse.stop(); glow.stop(); };
    }, [profile?.streak_count]);

    const fireOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
    });

    const handleStartLesson = async () => {
        resetLesson();
        await fetchOrGenerateLesson();
        if (useLessonStore.getState().lesson) {
            navigation.navigate('LessonReader');
        } else {
            Alert.alert('Error', useLessonStore.getState().error ?? 'Could not load lesson.');
        }
    };

    const handleFeedback = () => {
        navigation.navigate('Feedback' as never);
    };

    const todayCompleted = lesson?.is_completed ?? false;

    return (
        <View style={styles.container}>
            {/* Main Content */}
            <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <LinearGradient colors={['#58CC02', '#3D9A00']} style={styles.header}>
                    {/* Version badge - top left */}
                    <View style={styles.versionRow}>
                        <View style={styles.versionBadge}>
                            <Text style={styles.versionText}>v{APP_VERSION}</Text>
                        </View>
                    </View>

                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.greeting}>
                                Hey, {profile?.username ?? 'Learner'}! 👋
                            </Text>
                            <Text style={styles.subGreeting}>
                                {todayCompleted ? "I studied today! 🎯" : "Ready for today's mission?"}
                            </Text>
                        </View>
                        <View style={styles.headerRightActions}>
                            <TouchableOpacity onPress={() => navigation.navigate('News')} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>🔔</Text>
                                {unreadNews > 0 && <View style={styles.badge} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>ℹ️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>👤</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {/* Streak */}
                        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} style={styles.statCard}>
                            <Animated.Text style={[styles.statEmoji, { transform: [{ scale: pulseAnim }], opacity: fireOpacity }]}>
                                🔥
                            </Animated.Text>
                            <Text style={styles.statValue}>{profile?.streak_count ?? 0}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.statDivider} />

                        {/* XP */}
                        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')} style={styles.statCard}>
                            <Text style={styles.statEmoji}>⭐</Text>
                            <Text style={styles.statValue}>{profile?.total_xp ?? 0}</Text>
                            <Text style={styles.statLabel}>Total XP</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.statDivider} />

                        {/* Streak Freeze */}
                        <View style={styles.statCard}>
                            <Text style={styles.statEmoji}>❄️</Text>
                            <Text style={styles.statValue}>{profile?.streak_freeze_count ?? 0}</Text>
                            <Text style={styles.statLabel}>Freezes</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.innerContent}>
                    {/* Daily Mission Card */}
                    <View style={styles.missionCard}>
                        <View style={styles.missionIconRow}>
                            <Text style={styles.missionIcon}>🎯</Text>
                            <View style={styles.missionBadge}>
                                <Text style={styles.missionBadgeText}>DAILY MISSION</Text>
                            </View>
                        </View>
                        <Text style={styles.missionTitle}>
                            {todayCompleted ? "Mission Complete! 🎉" : "Your personalized lesson awaits"}
                        </Text>
                        <Text style={styles.missionDesc}>
                            {todayCompleted
                                ? "You've earned 30 XP for completing today's mission. Come back tomorrow to keep your streak!"
                                : "AI-crafted just for you, bridging your interests with new knowledge."}
                        </Text>

                        <TouchableOpacity
                            style={[styles.startButton, todayCompleted && styles.startButtonDone]}
                            onPress={handleStartLesson}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.startButtonText, todayCompleted && styles.startButtonTextDone]}>
                                {loading ? '⏳ Preparing...' : todayCompleted ? '🔄 Retry Lesson' : '🚀 Start Lesson'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Cards */}
                    <View style={styles.infoRow}>
                        <TouchableOpacity onPress={() => navigation.navigate('KnowledgeLibrary')} activeOpacity={0.8} style={styles.infoCard}>
                            <Text style={styles.infoEmoji}>📖</Text>
                            <Text style={styles.infoTitle}>Library</Text>
                            <Text style={styles.infoLabel}>View learned</Text>
                        </TouchableOpacity>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoEmoji}>🎓</Text>
                            <Text style={styles.infoTitle}>+30 XP</Text>
                            <Text style={styles.infoLabel}>Reward</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Text style={styles.infoEmoji}>✅</Text>
                            <Text style={styles.infoTitle}>+20 XP</Text>
                            <Text style={styles.infoLabel}>Per right answer</Text>
                        </View>
                    </View>

                    {/* Send Feedback Button */}
                    <TouchableOpacity style={styles.feedbackCard} onPress={handleFeedback} activeOpacity={0.8}>
                        <Text style={styles.feedbackEmoji}>💬</Text>
                        <View style={styles.feedbackTextCol}>
                            <Text style={styles.feedbackTitle}>Send Feedback</Text>
                            <Text style={styles.feedbackDesc}>Help us improve CurioConnect</Text>
                        </View>
                        <Text style={styles.feedbackArrow}>→</Text>
                    </TouchableOpacity>

                    {/* Motivational Footer */}
                    <Text style={styles.motivational}>
                        {(profile?.streak_count ?? 0) > 1
                            ? `🔥 ${profile?.streak_count}-day streak! Keep it up!`
                            : "Every expert was once a beginner. Start today!"}
                    </Text>
                </View>
            </ScrollView>

            <BottomNav currentRoute="Dashboard" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 60,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
        overflow: 'hidden',
    },
    versionRow: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    versionBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
    },
    versionText: {
        fontSize: FONTS.sizes.xs,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: FONTS.weights.medium,
        letterSpacing: 0.5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
    },
    greeting: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.white,
    },
    subGreeting: {
        fontSize: FONTS.sizes.md,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    actionBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    actionBtnText: {
        fontSize: FONTS.sizes.lg,
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 12,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    statCard: { flex: 1, alignItems: 'center' },
    statEmoji: { fontSize: 28, marginBottom: 4 },
    statValue: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.white,
    },
    statLabel: {
        fontSize: FONTS.sizes.xs,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: FONTS.weights.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: SPACING.md,
    },
    content: { paddingBottom: 100 },
    innerContent: { padding: SPACING.lg, gap: SPACING.lg },
    missionCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    missionIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    missionIcon: { fontSize: 28 },
    missionBadge: {
        backgroundColor: `${COLORS.primary}20`,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
    },
    missionBadgeText: {
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.bold,
        color: COLORS.primaryDark,
        letterSpacing: 1,
    },
    missionTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    missionDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    startButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    startButtonDone: {
        backgroundColor: COLORS.background,
        borderWidth: 2,
        borderColor: COLORS.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        letterSpacing: 0.3,
    },
    startButtonTextDone: {
        color: COLORS.textDark,
    },
    infoRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    infoCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    infoEmoji: { fontSize: 24, marginBottom: 4 },
    infoTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    infoLabel: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textMedium,
        textAlign: 'center',
        marginTop: 2,
    },
    feedbackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    feedbackEmoji: {
        fontSize: 28,
        marginRight: SPACING.md,
    },
    feedbackTextCol: {
        flex: 1,
    },
    feedbackTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    feedbackDesc: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        marginTop: 2,
    },
    feedbackArrow: {
        fontSize: 20,
        color: COLORS.textLight,
        fontWeight: 'bold',
    },
    motivational: {
        textAlign: 'center',
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        fontStyle: 'italic',
        paddingHorizontal: SPACING.md,
    },
});
