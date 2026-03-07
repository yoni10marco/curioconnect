import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useLessonStore } from '../../store/useLessonStore';
import { AppStackParamList } from '../../navigation';
import { APP_VERSION } from '../../lib/version';
import BottomNav from '../../components/BottomNav';

type Nav = NativeStackNavigationProp<AppStackParamList, 'Dashboard'>;

export default function DashboardScreen() {
    const navigation = useNavigation<Nav>();
    const { profile } = useAuthStore();
    const { fetchOrGenerateLesson, loading, lesson, resetLesson } = useLessonStore();


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

    const todayCompleted = lesson?.is_completed ?? false;

    return (
        <View style={styles.container}>
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
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                        <Text style={styles.profileBtnText}>👤</Text>
                    </TouchableOpacity>
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
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Daily Mission Card */}
                <TouchableOpacity onPress={() => navigation.navigate('LearningJourney')} activeOpacity={0.9} style={styles.missionCard}>
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
                            ? "You've earned 50 XP today. Come back tomorrow to keep your streak!"
                            : "AI-crafted just for you, bridging your interests with new knowledge."}
                    </Text>

                    <TouchableOpacity
                        style={[styles.startButton, todayCompleted && styles.startButtonDone]}
                        onPress={handleStartLesson}
                        disabled={loading || todayCompleted}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.startButtonText}>
                            {loading ? '⏳ Preparing...' : todayCompleted ? '✅ Completed!' : '🚀 Start Lesson'}
                        </Text>
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Info Cards */}
                <View style={styles.infoRow}>
                    <TouchableOpacity onPress={() => navigation.navigate('KnowledgeLibrary')} activeOpacity={0.8} style={styles.infoCard}>
                        <Text style={styles.infoEmoji}>📖</Text>
                        <Text style={styles.infoTitle}>Library</Text>
                        <Text style={styles.infoLabel}>View learned</Text>
                    </TouchableOpacity>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoEmoji}>🎓</Text>
                        <Text style={styles.infoTitle}>+50 XP</Text>
                        <Text style={styles.infoLabel}>Reward</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.infoEmoji}>❓</Text>
                        <Text style={styles.infoTitle}>3</Text>
                        <Text style={styles.infoLabel}>Quiz questions</Text>
                    </View>
                </View>

                {/* Motivational Footer */}
                <Text style={styles.motivational}>
                    {(profile?.streak_count ?? 0) > 1
                        ? `🔥 ${profile?.streak_count}-day streak! Keep it up!`
                        : "Every expert was once a beginner. Start today!"}
                </Text>
            </ScrollView>

            <BottomNav currentRoute="Dashboard" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 48,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
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
    profileBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileBtnText: {
        fontSize: FONTS.sizes.lg,
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
    content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },
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
        backgroundColor: COLORS.textLight,
        shadowOpacity: 0,
        elevation: 0,
    },
    startButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        letterSpacing: 0.3,
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
    motivational: {
        textAlign: 'center',
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        fontStyle: 'italic',
        paddingHorizontal: SPACING.md,
    },
});
