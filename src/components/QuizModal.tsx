import React, { useState, useRef } from 'react';
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
} from 'react-native';

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

    // Store shuffled options and correct answer string for current question
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    const [correctAnswerStr, setCorrectAnswerStr] = useState<string>('');

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const { completeLesson } = useLessonStore();

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
            triggerHaptic('success');
            setAnswerState('correct');
            setScore((s) => s + 1);
        } else {
            setAnswerState('wrong');
            shake();
        }
    };

    const handleNext = async () => {
        const nextIdx = current + 1;
        if (nextIdx >= questions.length) {
            setFinished(true);
            if (isFinalPage) {
                await completeLesson();
            }
        } else {
            setCurrent(nextIdx);
            setSelected(null);
            setAnswerState('unanswered');
        }
    };

    const handleRestartAndClose = () => {
        setCurrent(0);
        setSelected(null);
        setAnswerState('unanswered');
        setScore(0);
        setFinished(false);
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

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Knowledge Check</Text>
                    <View style={styles.scoreChip}>
                        <Text style={styles.scoreChipText}>⭐ {score}/{questions.length}</Text>
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
                    // Results Screen
                    <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                        <Text style={styles.resultsEmoji}>
                            {isFinalPage ? (score === questions.length ? '🏆' : '🌟') : '📖'}
                        </Text>
                        <Text style={styles.resultsTitle}>
                            {isFinalPage ? 'Lesson Complete!' : 'Knowledge Checked!'}
                        </Text>
                        <Text style={styles.resultsScore}>{score} / {questions.length} correct</Text>
                        {isFinalPage && <Text style={styles.resultsXp}>+50 XP Earned! 🎉</Text>}
                        {isFinalPage && <Text style={styles.resultsStreak}>Your streak is growing! 🔥</Text>}
                        <TouchableOpacity style={styles.doneButton} onPress={handleRestartAndClose}>
                            <Text style={styles.doneButtonText}>{isFinalPage ? 'Back to Dashboard' : 'Read Next Page'}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    // Question Screen
                    <Animated.View key={current} style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
                        {!question ? (
                            <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
                                <Text style={styles.resultsEmoji}>😕</Text>
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
                                    {shuffledOptions.map((opt, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={getOptionStyle(idx)}
                                            onPress={() => handleSelect(idx)}
                                            activeOpacity={0.8}
                                            disabled={answerState !== 'unanswered'}
                                        >
                                            <View style={styles.optionLabel}>
                                                <Text style={styles.optionLetter}>
                                                    {['A', 'B', 'C', 'D'][idx]}
                                                </Text>
                                            </View>
                                            <Text style={getOptionTextStyle(idx)}>{opt}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {answerState !== 'unanswered' && (
                                    <View style={[styles.feedback, answerState === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong]}>
                                        <Text style={styles.feedbackText}>
                                            {answerState === 'correct' ? '✅ Correct! Well done!' : `❌ The correct answer was: ${correctAnswerStr}`}
                                        </Text>
                                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
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
    scoreChipText: {
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
        color: '#B8860B',
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
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}12`,
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
    optionTextCorrect: { color: COLORS.primaryDark, fontWeight: FONTS.weights.semibold },
    optionTextWrong: { color: COLORS.danger, fontWeight: FONTS.weights.semibold },
    feedback: {
        borderRadius: RADIUS.xl,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    feedbackCorrect: { backgroundColor: `${COLORS.primary}15` },
    feedbackWrong: { backgroundColor: `${COLORS.danger}10` },
    feedbackText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        fontWeight: FONTS.weights.medium,
        marginBottom: SPACING.md,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
    },
    nextButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
    results: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    resultsEmoji: { fontSize: 80, marginBottom: SPACING.lg },
    resultsTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    resultsScore: {
        fontSize: FONTS.sizes.xl,
        color: COLORS.textMedium,
        marginBottom: SPACING.sm,
    },
    resultsXp: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    resultsStreak: {
        fontSize: FONTS.sizes.md,
        color: COLORS.streak,
        marginBottom: SPACING.xl,
    },
    doneButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
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
