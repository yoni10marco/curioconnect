import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    SafeAreaView,
    Platform,
    ScrollView,
    Alert,
    Dimensions,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Haptics are native-only — safe no-op on web
const triggerHaptic = async (type: 'success' | 'error') => {
    if (Platform.OS === 'web') return;
    const Haptics = await import('expo-haptics');
    if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};
import { COLORS, FONTS, SPACING, RADIUS } from '../lib/theme';
import { QuizQuestion } from '../lib/types';
import { useLessonStore } from '../store/useLessonStore';
import { useAuthStore } from '../store/useAuthStore';
import { useRewardedAd } from '../hooks/useRewardedAd';
import { AD_UNITS } from '../lib/ads';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ──────────────────────────────────────────
// Sparkle Particle Component (correct answer)
// ──────────────────────────────────────────
const SPARKLE_COLORS = ['#FFD700', '#00D4FF', '#FF3D71', '#FF6B35', '#66E5FF', '#FFFFFF'];

function SparkleEffect({ active }: { active: boolean }) {
    const particles = useRef(
        Array.from({ length: 12 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
            angle: Math.random() * Math.PI * 2,
            distance: 40 + Math.random() * 60,
        }))
    ).current;

    useEffect(() => {
        if (!active) return;
        particles.forEach((p) => {
            p.x.setValue(0);
            p.y.setValue(0);
            p.opacity.setValue(1);
            p.scale.setValue(0);

            const targetX = Math.cos(p.angle) * p.distance;
            const targetY = Math.sin(p.angle) * p.distance;

            Animated.parallel([
                Animated.timing(p.x, { toValue: targetX, duration: 500, useNativeDriver: true }),
                Animated.timing(p.y, { toValue: targetY, duration: 500, useNativeDriver: true }),
                Animated.sequence([
                    Animated.timing(p.scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
                    Animated.timing(p.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.delay(200),
                    Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]),
            ]).start();
        });
    }, [active]);

    if (!active) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: p.color,
                        transform: [
                            { translateX: p.x },
                            { translateY: p.y },
                            { scale: p.scale },
                        ],
                        opacity: p.opacity,
                    }}
                />
            ))}
        </View>
    );
}

// ──────────────────────────────────────────
// Confetti Component (lesson completion)
// ──────────────────────────────────────────
const CONFETTI_COLORS = ['#FFD700', '#00D4FF', '#FF3D71', '#FF6B35', '#0088CC', '#66E5FF', '#FF6B6B', '#50C878'];

function ConfettiEffect({ active }: { active: boolean }) {
    const pieces = useRef(
        Array.from({ length: 40 }, () => ({
            x: new Animated.Value(Math.random() * SCREEN_WIDTH),
            y: new Animated.Value(-20),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            width: 6 + Math.random() * 8,
            height: 10 + Math.random() * 14,
            startX: Math.random() * SCREEN_WIDTH,
            drift: (Math.random() - 0.5) * 100,
            delay: Math.random() * 600,
            duration: 2000 + Math.random() * 1500,
        }))
    ).current;

    useEffect(() => {
        if (!active) return;
        pieces.forEach((p) => {
            p.x.setValue(p.startX);
            p.y.setValue(-20);
            p.rotate.setValue(0);
            p.opacity.setValue(1);

            Animated.sequence([
                Animated.delay(p.delay),
                Animated.parallel([
                    Animated.timing(p.y, { toValue: SCREEN_HEIGHT + 20, duration: p.duration, useNativeDriver: true }),
                    Animated.timing(p.x, { toValue: p.startX + p.drift, duration: p.duration, useNativeDriver: true }),
                    Animated.timing(p.rotate, { toValue: 6, duration: p.duration, useNativeDriver: true }),
                    Animated.sequence([
                        Animated.delay(p.duration * 0.7),
                        Animated.timing(p.opacity, { toValue: 0, duration: p.duration * 0.3, useNativeDriver: true }),
                    ]),
                ]),
            ]).start();
        });
    }, [active]);

    if (!active) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="none">
            {pieces.map((p, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: p.width,
                        height: p.height,
                        borderRadius: 2,
                        backgroundColor: p.color,
                        opacity: p.opacity,
                        transform: [
                            { translateX: p.x },
                            { translateY: p.y },
                            { rotate: p.rotate.interpolate({ inputRange: [0, 6], outputRange: ['0deg', '2160deg'] }) },
                        ],
                    }}
                />
            ))}
        </View>
    );
}

// ──────────────────────────────────────────
// Shimmer Button Component
// ──────────────────────────────────────────
function ShimmerButton({ label, onPress, style }: { label: string; onPress: () => void; style?: any }) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
        );
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        shimmer.start();
        pulse.start();
        return () => { shimmer.stop(); pulse.stop(); };
    }, []);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 300],
    });

    return (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.doneButton, style]}>
                <LinearGradient
                    colors={['#00D4FF', '#0066FF', '#00D4FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
                {/* Shimmer overlay */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: 'rgba(255,255,255,0.25)',
                            width: 60,
                            transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
                        },
                    ]}
                />
                <Text style={styles.doneButtonText}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ──────────────────────────────────────────
// Main QuizModal
// ──────────────────────────────────────────

interface Props {
    visible: boolean;
    questions: QuizQuestion[];
    isFinalPage: boolean;
    onClose: () => void;
    onComplete: () => void;
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

export default function QuizModal({ visible, questions, isFinalPage, onClose, onComplete }: Props) {
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [doubleXpClaimed, setDoubleXpClaimed] = useState(false);
    const [showSparkles, setShowSparkles] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Store shuffled options and correct answer string for current question
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    const [correctAnswerStr, setCorrectAnswerStr] = useState<string>('');

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const correctBounceAnim = useRef(new Animated.Value(1)).current;
    const correctGlowAnim = useRef(new Animated.Value(0)).current;
    const mascotAnim = useRef(new Animated.Value(0)).current;
    const resultsScaleAnim = useRef(new Animated.Value(0)).current;

    const { lesson, completeLesson } = useLessonStore();
    const { addXp } = useAuthStore();
    // Capture completion state when modal opens so results screen stays stable after completeLesson() runs
    const wasAlreadyCompleted = useRef(lesson?.is_completed ?? false);

    // Accumulate quiz XP across ALL pages so the double XP ad covers the full lesson
    const cumulativeQuizXpRef = useRef(0);

    // Mutex to prevent double-tap on "Finish Lesson" / "Next Question"
    const handlingNextRef = useRef(false);

    // Once-per-day guard for double XP ad
    const [doubleXpWatchedToday, setDoubleXpWatchedToday] = useState(false);
    useEffect(() => {
        AsyncStorage.getItem('doubleXpLastDate').then((stored) => {
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (stored === today) setDoubleXpWatchedToday(true);
        });
    }, []);

    // Total XP earned this lesson (all quiz answers accumulated + final bonus), used for doubling
    const totalXpEarned = cumulativeQuizXpRef.current + (isFinalPage && finished ? 30 : 0);

    const doubleXpAd = useRewardedAd(AD_UNITS.doubleXp, async () => {
        const xpToDouble = cumulativeQuizXpRef.current + 30;
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        await AsyncStorage.setItem('doubleXpLastDate', today);
        setDoubleXpWatchedToday(true);
        setDoubleXpClaimed(true);
        await addXp(xpToDouble);
        Alert.alert('Double XP! 🚀', `+${xpToDouble} bonus XP earned!`);
    });

    // Animate results screen entrance + confetti
    useEffect(() => {
        if (finished) {
            resultsScaleAnim.setValue(0.5);
            Animated.spring(resultsScaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 80,
                useNativeDriver: true,
            }).start();

            // Victory mascot bounce
            Animated.loop(
                Animated.sequence([
                    Animated.timing(mascotAnim, { toValue: -12, duration: 400, useNativeDriver: true }),
                    Animated.timing(mascotAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                ])
            ).start();

            if (isFinalPage && !wasAlreadyCompleted.current) {
                setShowConfetti(true);
            }
        }
    }, [finished]);

    const shake = () => {
        triggerHaptic('error');
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const triggerCorrectBurst = () => {
        triggerHaptic('success');

        // Bounce the correct option
        correctBounceAnim.setValue(0.9);
        Animated.spring(correctBounceAnim, {
            toValue: 1,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
        }).start();

        // Glow pulse
        correctGlowAnim.setValue(0);
        Animated.sequence([
            Animated.timing(correctGlowAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
            Animated.timing(correctGlowAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
        ]).start();

        // Sparkles
        setShowSparkles(false);
        setTimeout(() => setShowSparkles(true), 10);
    };

    const question = questions[current];

    // On new question, shuffle options
    React.useEffect(() => {
        if (question) {
            const originalCorrect = question.options[question.answer_idx];
            setCorrectAnswerStr(originalCorrect);
            // Copy and shuffle
            const shuffled = [...question.options].sort(() => Math.random() - 0.5);
            setShuffledOptions(shuffled);
        }
    }, [current, question]);

    const handleSelect = (idx: number) => {
        if (answerState !== 'unanswered') return;
        setSelected(idx);

        const correct = shuffledOptions[idx] === correctAnswerStr;
        if (correct) {
            setAnswerState('correct');
            setScore((s) => s + 1);
            triggerCorrectBurst();
        } else {
            setAnswerState('wrong');
            shake();
        }
    };

    const handleNext = async () => {
        if (handlingNextRef.current) return;
        handlingNextRef.current = true;
        try {
            const nextIdx = current + 1;
            if (nextIdx >= questions.length) {
                setFinished(true);
                // Add quiz XP first (awaited), so completeLesson reads the updated profile
                if (!wasAlreadyCompleted.current && score > 0) {
                    const quizXp = score * 20;
                    cumulativeQuizXpRef.current += quizXp;
                    await addXp(quizXp);
                }
                if (isFinalPage) {
                    await completeLesson();
                }
            } else {
                setCurrent(nextIdx);
                setSelected(null);
                setAnswerState('unanswered');
                setShowSparkles(false);
            }
        } finally {
            handlingNextRef.current = false;
        }
    };

    const handleRestartAndClose = () => {
        setCurrent(0);
        setSelected(null);
        setAnswerState('unanswered');
        setScore(0);
        setFinished(false);
        setDoubleXpClaimed(false);
        setShowSparkles(false);
        setShowConfetti(false);
        handlingNextRef.current = false;
        mascotAnim.setValue(0);
        onComplete();
    };

    const getOptionStyle = (idx: number) => {
        if (answerState === 'unanswered') return styles.option;
        if (shuffledOptions[idx] === correctAnswerStr) return [styles.option, styles.optionCorrect];
        if (idx === selected && answerState === 'wrong') return [styles.option, styles.optionWrong];
        return styles.option;
    };

    const getOptionTextStyle = (idx: number) => {
        if (answerState === 'unanswered') return styles.optionText;
        if (shuffledOptions[idx] === correctAnswerStr) return [styles.optionText, styles.optionTextCorrect];
        if (idx === selected && answerState === 'wrong') return [styles.optionText, styles.optionTextWrong];
        return styles.optionText;
    };

    const correctGlowColor = correctGlowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(80, 200, 120, 0)', 'rgba(80, 200, 120, 0.15)'],
    });

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.safeArea}>
                {/* Confetti overlay for lesson completion */}
                <ConfettiEffect active={showConfetti} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Knowledge Check</Text>
                    <View style={styles.scoreChip}>
                        <View style={styles.scoreChipInner}>
                            <Ionicons name="star" size={14} color={COLORS.xp} />
                            <Text style={styles.scoreChipText}> {score}/{questions.length}</Text>
                        </View>
                    </View>
                </View>

                {/* Progress dots */}
                <View style={styles.progressDots}>
                    {questions.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i < current && styles.dotDone,
                                i === current && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>

                {finished ? (
                    // ──────────────────────────────────────────
                    // RESULTS / GRAND FINALE SCREEN
                    // ──────────────────────────────────────────
                    <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                        <Animated.View style={[styles.resultsInner, { transform: [{ scale: resultsScaleAnim }] }]}>
                            {/* Mascot with victory bounce */}
                            <Animated.View style={{ transform: [{ translateY: mascotAnim }] }}>
                                <Image
                                    source={require('../../assets/icon.png')}
                                    style={styles.mascotImage}
                                />
                            </Animated.View>

                            {isFinalPage ? (
                                <LinearGradient
                                    colors={['#FFB800', '#FF3D71', '#00D4FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.completionBadge}
                                >
                                    <Text style={styles.completionBadgeText}>LESSON COMPLETE</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.pageCompleteBadge}>
                                    <Text style={styles.pageCompleteBadgeText}>PAGE CLEARED</Text>
                                </View>
                            )}

                            <Text style={styles.resultsTitle}>
                                {isFinalPage
                                    ? (score === questions.length ? 'Perfect Score!' : 'Well Done!')
                                    : 'Knowledge Checked!'}
                            </Text>

                            <Text style={styles.scoreCircleText}>
                                <Text style={styles.scoreCircleNumber}>{score}</Text>
                                <Text style={styles.scoreCircleDenom}>/{questions.length}</Text>
                            </Text>

                            {!wasAlreadyCompleted.current && cumulativeQuizXpRef.current > 0 && (
                                <View style={styles.xpBadge}>
                                    <Text style={styles.xpBadgeText}>+{cumulativeQuizXpRef.current} XP</Text>
                                </View>
                            )}
                            {isFinalPage && !wasAlreadyCompleted.current && (
                                <View style={[styles.xpBadge, styles.xpBadgeGold]}>
                                    <Text style={[styles.xpBadgeText, styles.xpBadgeTextGold]}>+30 XP Completion Bonus 🎓</Text>
                                </View>
                            )}
                            {isFinalPage && !wasAlreadyCompleted.current && (
                                <Text style={styles.resultsStreak}>Your streak is growing! 🔥</Text>
                            )}

                            {/* Ad: Double XP — only on first completion of final page, once per day */}
                            {isFinalPage && !wasAlreadyCompleted.current && !doubleXpClaimed && !doubleXpWatchedToday && (
                                <TouchableOpacity
                                    style={[styles.doubleXpButton, !doubleXpAd.isLoaded && styles.doubleXpButtonDisabled]}
                                    onPress={() => doubleXpAd.show()}
                                    disabled={!doubleXpAd.isLoaded}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#FFD700', '#FFA500']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Text style={styles.doubleXpButtonText}>
                                        {doubleXpAd.isLoaded ? `📺 Watch ad → Double XP (+${cumulativeQuizXpRef.current + 30} bonus)` : '⏳ Loading ad...'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <ShimmerButton
                                label={isFinalPage ? 'Back to Dashboard' : 'Read Next Page'}
                                onPress={handleRestartAndClose}
                            />
                        </Animated.View>
                    </ScrollView>
                ) : (
                    // ──────────────────────────────────────────
                    // QUESTION SCREEN
                    // ──────────────────────────────────────────
                    <Animated.View key={current} style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
                        {/* Animated glow overlay on correct */}
                        <Animated.View
                            style={[StyleSheet.absoluteFill, { backgroundColor: correctGlowColor, zIndex: -1 }]}
                            pointerEvents="none"
                        />

                        {!question ? (
                            <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                                <Ionicons name="alert-circle-outline" size={80} color={COLORS.textLight} style={{ marginBottom: SPACING.lg }} />
                                <Text style={styles.resultsTitle}>Quiz data error</Text>
                                <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                                    <Text style={styles.doneButtonText}>Close</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            <ScrollView
                                key={`question-${current}`}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: SPACING.xl, flexGrow: 1 }}
                            >
                                <View style={styles.questionBox}>
                                    <Text style={styles.questionNumber}>Question {current + 1} of {questions.length}</Text>
                                    <Text style={styles.questionText}>{question.q}</Text>
                                </View>

                                <View style={styles.options}>
                                    {shuffledOptions.map((opt, idx) => {
                                        const isCorrectOption = shuffledOptions[idx] === correctAnswerStr;
                                        const shouldBounce = answerState === 'correct' && isCorrectOption;

                                        return (
                                            <Animated.View
                                                key={idx}
                                                style={shouldBounce ? { transform: [{ scale: correctBounceAnim }] } : undefined}
                                            >
                                                <TouchableOpacity
                                                    style={getOptionStyle(idx)}
                                                    onPress={() => handleSelect(idx)}
                                                    activeOpacity={0.8}
                                                    disabled={answerState !== 'unanswered'}
                                                >
                                                    <View style={[
                                                        styles.optionLabel,
                                                        answerState === 'correct' && isCorrectOption && styles.optionLabelCorrect,
                                                    ]}>
                                                        <Text style={[
                                                            styles.optionLetter,
                                                            answerState === 'correct' && isCorrectOption && styles.optionLetterCorrect,
                                                        ]}>
                                                            {answerState === 'correct' && isCorrectOption ? '✓' : ['A', 'B', 'C', 'D'][idx]}
                                                        </Text>
                                                    </View>
                                                    <Text style={getOptionTextStyle(idx)}>{opt}</Text>
                                                </TouchableOpacity>
                                                {/* Sparkle burst on the correct option */}
                                                {shouldBounce && <SparkleEffect active={showSparkles} />}
                                            </Animated.View>
                                        );
                                    })}
                                </View>

                                {answerState !== 'unanswered' && (
                                    <View style={[styles.feedback, answerState === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong]}>
                                        {answerState === 'correct' ? (
                                            <LinearGradient
                                                colors={['#50C87810', '#10B98120']}
                                                style={[StyleSheet.absoluteFill, { borderRadius: RADIUS.xl }]}
                                            />
                                        ) : null}
                                        <View style={styles.feedbackRow}>
                                            <Ionicons
                                                name={answerState === 'correct' ? 'checkmark-circle' : 'close-circle'}
                                                size={22}
                                                color={answerState === 'correct' ? '#22C55E' : COLORS.danger}
                                            />
                                            <Text style={[styles.feedbackText, answerState === 'correct' && styles.feedbackTextCorrect]}>
                                                {answerState === 'correct' ? ' Correct! Well done!' : ` The correct answer was: ${correctAnswerStr}`}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.nextButton, answerState === 'correct' && styles.nextButtonCorrect]}
                                            onPress={handleNext}
                                        >
                                            <Text style={styles.nextButtonText}>
                                                {current + 1 >= questions.length ? (isFinalPage ? 'Finish Lesson' : 'See Results') : 'Next Question →'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </Animated.View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.white },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { fontSize: 16, color: COLORS.textMedium },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    scoreChip: {
        backgroundColor: `${COLORS.accent}20`,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
    },
    scoreChipInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreChipText: {
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
        color: COLORS.accentOrange,
    },
    progressDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.border,
    },
    dotDone: { backgroundColor: COLORS.primary },
    dotActive: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 1.2 }] },
    content: { flex: 1, padding: SPACING.lg },
    questionBox: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    questionNumber: {
        fontSize: FONTS.sizes.xs,
        color: COLORS.textLight,
        fontWeight: FONTS.weights.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    questionText: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        lineHeight: 30,
    },
    options: { gap: SPACING.sm },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        gap: SPACING.md,
    },
    optionCorrect: {
        borderColor: '#50C878',
        backgroundColor: '#50C87812',
    },
    optionWrong: {
        borderColor: COLORS.danger,
        backgroundColor: `${COLORS.danger}12`,
    },
    optionLabel: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionLabelCorrect: {
        backgroundColor: '#50C878',
    },
    optionLetterCorrect: {
        color: COLORS.white,
        fontWeight: FONTS.weights.heavy,
    },
    optionLetter: {
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textMedium,
    },
    optionText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        flex: 1,
        lineHeight: 22,
    },
    optionTextCorrect: { color: '#2E7D32', fontWeight: FONTS.weights.semibold },
    optionTextWrong: { color: COLORS.danger, fontWeight: FONTS.weights.semibold },
    feedback: {
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginTop: SPACING.md,
        overflow: 'hidden',
    },
    feedbackCorrect: { backgroundColor: '#50C87815' },
    feedbackWrong: { backgroundColor: `${COLORS.danger}10` },
    feedbackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    feedbackText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        fontWeight: FONTS.weights.medium,
        flex: 1,
    },
    feedbackTextCorrect: {
        color: '#2E7D32',
        fontWeight: FONTS.weights.bold,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    nextButtonCorrect: {
        backgroundColor: '#50C878',
    },
    nextButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
    // ── Results / Grand Finale ──
    results: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    resultsInner: {
        alignItems: 'center',
        width: '100%',
    },
    mascotImage: {
        width: 120,
        height: 120,
        borderRadius: 28,
        marginBottom: SPACING.md,
    },
    completionBadge: {
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.md,
    },
    completionBadgeText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.heavy,
        letterSpacing: 2,
    },
    pageCompleteBadge: {
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.md,
        backgroundColor: `${COLORS.primary}20`,
    },
    pageCompleteBadgeText: {
        color: COLORS.primaryDark,
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.heavy,
        letterSpacing: 2,
    },
    resultsEmoji: { fontSize: 80, marginBottom: SPACING.lg },
    resultsTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    scoreCircleText: {
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    scoreCircleNumber: {
        fontSize: 48,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.primary,
    },
    scoreCircleDenom: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textLight,
    },
    resultsScore: {
        fontSize: FONTS.sizes.xl,
        color: COLORS.textMedium,
        marginBottom: SPACING.sm,
    },
    xpBadge: {
        backgroundColor: `${COLORS.primary}18`,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    xpBadgeGold: {
        backgroundColor: '#FFD70025',
    },
    xpBadgeText: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.primary,
    },
    xpBadgeTextGold: {
        color: '#B8860B',
    },
    resultsStreak: {
        fontSize: FONTS.sizes.md,
        color: COLORS.streak,
        marginBottom: SPACING.xl,
        fontWeight: FONTS.weights.bold,
    },
    doubleXpButton: {
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.md,
        overflow: 'hidden',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    doubleXpButtonDisabled: {
        backgroundColor: COLORS.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    doubleXpButtonText: {
        color: COLORS.textDark,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
        textAlign: 'center',
    },
    doneButton: {
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 200,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    doneButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
});
