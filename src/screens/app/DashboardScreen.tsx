import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useLessonStore } from '../../store/useLessonStore';
import { AppStackParamList } from '../../navigation';
import { APP_VERSION } from '../../lib/version';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../lib/supabase';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { AD_UNITS, MAX_FREEZE } from '../../lib/ads';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>;

const truncateName = (name: string, max = 12) =>
    name.length > max ? name.slice(0, max) + '...' : name;

export default function DashboardScreen() {
    const navigation = useNavigation<Nav>();
    const { profile, session, checkAndResetStreak, addStreakFreeze } = useAuthStore();
    const { fetchOrGenerateLesson, loading, lesson, resetLesson, checkTodayLesson, unlockBonusLesson } = useLessonStore();

    const [unreadNews, setUnreadNews] = useState(0);
    const [bonusLessonLoading, setBonusLessonLoading] = useState(false);
    const [freezeWatchedToday, setFreezeWatchedToday] = useState(false);

    const _d = new Date();
    const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        AsyncStorage.getItem('freezeAdLastDate').then((stored) => {
            if (stored === todayStr) setFreezeWatchedToday(true);
        });
    }, [todayStr]);

    const canGetFreeze = (profile?.streak_freeze_count ?? 0) < MAX_FREEZE;
    const bonusAlreadyUnlocked = profile?.bonus_lesson_date === todayStr;

    const freezeAd = useRewardedAd(AD_UNITS.freeze, async () => {
        await AsyncStorage.setItem('freezeAdLastDate', todayStr);
        setFreezeWatchedToday(true);
        await addStreakFreeze();
        Alert.alert('Freeze Added!', 'You earned +1 streak freeze!');
    });

    const bonusLessonAd = useRewardedAd(AD_UNITS.bonusLesson, async () => {
        setBonusLessonLoading(true);
        await unlockBonusLesson();
        await fetchOrGenerateLesson(2);
        setBonusLessonLoading(false);
        if (useLessonStore.getState().lesson) {
            navigation.navigate('LessonReader');
        } else {
            Alert.alert('Error', 'Could not load bonus lesson. Try again later.');
        }
    });

    const startingLessonRef = useRef(false);
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
        if (startingLessonRef.current) return;
        startingLessonRef.current = true;
        try {
            resetLesson();
            await fetchOrGenerateLesson();
            if (useLessonStore.getState().lesson) {
                navigation.navigate('LessonReader');
            } else {
                Alert.alert('Error', useLessonStore.getState().error ?? 'Could not load lesson.');
            }
        } finally {
            startingLessonRef.current = false;
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
                <LinearGradient colors={['#00D4FF', '#0066FF']} style={styles.header}>
                    {/* Version badge - top left */}
                    <View style={styles.versionRow}>
                        <View style={styles.versionBadge}>
                            <Text style={styles.versionText}>v{APP_VERSION}</Text>
                        </View>
                    </View>

                    <View style={styles.headerContent}>
                        <View style={styles.greetingContainer}>
                            <Text style={styles.greeting} numberOfLines={1}>
                                Hey, {truncateName(profile?.username ?? 'Learner')}!
                            </Text>
                            <Text style={styles.subGreeting}>
                                {todayCompleted ? "I studied today!" : "Ready for today's mission?"}
                            </Text>
                        </View>
                        <View style={styles.headerRightActions}>
                            <TouchableOpacity onPress={() => navigation.navigate('News')} style={[styles.actionBtn, styles.actionBtnNews]}>
                                <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                                {unreadNews > 0 && <View style={styles.badge} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('About')} style={[styles.actionBtn, styles.actionBtnAbout]}>
                                <Ionicons name="information-circle-outline" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={[styles.actionBtn, styles.actionBtnProfile]}>
                                <Ionicons name="person-outline" size={20} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {/* Streak */}
                        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard', { initialTab: 'streak' })} style={styles.statCard}>
                            <Animated.View style={{ opacity: fireOpacity }}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                    <Ionicons name="flame" size={28} color={COLORS.streak} />
                                </Animated.View>
                            </Animated.View>
                            <Text style={styles.statValue}>{profile?.streak_count ?? 0}</Text>
                            <Text style={styles.statLabel}>Day Streak</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.statDivider} />

                        {/* XP */}
                        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard', { initialTab: 'xp' })} style={styles.statCard}>
                            <Ionicons name="star" size={28} color={COLORS.xp} />
                            <Text style={styles.statValue}>{profile?.total_xp ?? 0}</Text>
                            <Text style={styles.statLabel}>Total XP</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.statDivider} />

                        {/* Streak Freeze */}
                        <View style={styles.statCard}>
                            <Ionicons name="snow" size={28} color={COLORS.primaryLight} />
                            <Text style={styles.statValue}>{profile?.streak_freeze_count ?? 0}</Text>
                            <Text style={styles.statLabel}>Freezes</Text>
                        </View>
                    </View>

                    {/* Ad: Watch for free freeze — once per day */}
                    {canGetFreeze && !freezeWatchedToday && (
                        <TouchableOpacity
                            style={styles.adBanner}
                            onPress={() => freezeAd.show()}
                            disabled={!freezeAd.isLoaded}
                            activeOpacity={0.85}
                        >
                            <View style={styles.buttonInner}>
                                <Ionicons name="tv-outline" size={14} color={COLORS.white} />
                                <Text style={styles.adBannerText}>
                                    {freezeAd.isLoaded ? ' Watch ad → +1 Freeze' : ' Loading ad...'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </LinearGradient>

                <View style={styles.innerContent}>
                    {/* Daily Mission Card */}
                    <View style={styles.missionCard}>
                        <View style={styles.missionIconRow}>
                            <Ionicons name="locate" size={28} color={COLORS.primary} />
                            <View style={styles.missionBadge}>
                                <Text style={styles.missionBadgeText}>DAILY MISSION</Text>
                            </View>
                        </View>
                        <Text style={styles.missionTitle}>
                            {todayCompleted ? "Mission Complete!" : "Your personalized lesson awaits"}
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
                            <View style={styles.buttonInner}>
                                {loading ? (
                                    <Text style={[styles.startButtonText, todayCompleted && styles.startButtonTextDone]}>Preparing...</Text>
                                ) : todayCompleted ? (
                                    <>
                                        <Ionicons name="refresh" size={18} color={COLORS.textDark} />
                                        <Text style={[styles.startButtonText, styles.startButtonTextDone]}> Retry Lesson</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="rocket" size={18} color={COLORS.white} />
                                        <Text style={styles.startButtonText}> Start Lesson</Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Ad: Bonus lesson (only after today's lesson is completed and not yet unlocked) */}
                    {todayCompleted && !bonusAlreadyUnlocked && (
                        <TouchableOpacity
                            style={styles.bonusCard}
                            onPress={() => bonusLessonAd.show()}
                            disabled={!bonusLessonAd.isLoaded || bonusLessonLoading}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="tv-outline" size={28} color={COLORS.accent} />
                            <View style={styles.bonusCardText}>
                                <Text style={styles.bonusCardTitle}>Want more? Unlock a Bonus Lesson!</Text>
                                <Text style={styles.bonusCardDesc}>
                                    {bonusLessonLoading ? 'Loading your bonus lesson...' : bonusLessonAd.isLoaded ? 'Watch a short ad to unlock a second lesson today.' : 'Loading ad...'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    )}

                    {/* Info Cards */}
                    <View style={styles.infoRow}>
                        <TouchableOpacity onPress={() => navigation.navigate('KnowledgeLibrary')} activeOpacity={0.8} style={styles.infoCard}>
                            <Ionicons name="book-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.infoTitle}>Library</Text>
                            <Text style={styles.infoLabel}>View learned</Text>
                        </TouchableOpacity>
                        <View style={styles.infoCard}>
                            <Ionicons name="school-outline" size={24} color={COLORS.xp} />
                            <Text style={styles.infoTitle}>+30 XP</Text>
                            <Text style={styles.infoLabel}>Reward</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                            <Text style={styles.infoTitle}>+20 XP</Text>
                            <Text style={styles.infoLabel}>Per right answer</Text>
                        </View>
                    </View>

                    {/* Send Feedback Button */}
                    <TouchableOpacity style={styles.feedbackCard} onPress={handleFeedback} activeOpacity={0.8}>
                        <Ionicons name="chatbubble-outline" size={28} color={COLORS.primary} />
                        <View style={styles.feedbackTextCol}>
                            <Text style={styles.feedbackTitle}>Send Feedback</Text>
                            <Text style={styles.feedbackDesc}>Help us improve CurioConnect</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>

                    {/* Motivational Footer */}
                    <Text style={styles.motivational}>
                        {(profile?.streak_count ?? 0) > 1
                            ? `${profile?.streak_count}-day streak! Keep it up!`
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
    greetingContainer: {
        flex: 1,
        marginRight: SPACING.sm,
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
        flexShrink: 0,
        gap: SPACING.sm,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    actionBtnNews: {
        backgroundColor: 'rgba(255, 184, 0, 0.35)',
    },
    actionBtnAbout: {
        backgroundColor: 'rgba(102, 229, 255, 0.35)',
    },
    actionBtnProfile: {
        backgroundColor: 'rgba(255, 61, 113, 0.35)',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.danger,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.white,
        marginTop: 4,
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
    buttonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    infoTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginTop: 4,
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
        gap: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
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
    motivational: {
        textAlign: 'center',
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        fontStyle: 'italic',
        paddingHorizontal: SPACING.md,
    },
    adBanner: {
        marginTop: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    adBannerText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
    },
    bonusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        gap: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 2,
        borderColor: `${COLORS.accent}40`,
    },
    bonusCardText: { flex: 1 },
    bonusCardTitle: {
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    bonusCardDesc: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        marginTop: 2,
    },
});
