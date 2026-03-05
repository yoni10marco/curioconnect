import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useLessonStore } from '../../store/useLessonStore';
import { AppStackParamList } from '../../navigation';
import QuizModal from '../../components/QuizModal';

type Nav = NativeStackNavigationProp<AppStackParamList, 'LessonReader'>;

export default function LessonReaderScreen() {
    const navigation = useNavigation<Nav>();
    const { lesson } = useLessonStore();
    const [progress, setProgress] = useState(0);
    const [quizVisible, setQuizVisible] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const scrolled = contentOffset.y / (contentSize.height - layoutMeasurement.height);
        const clamped = Math.max(0, Math.min(1, scrolled));
        setProgress(clamped);
        Animated.timing(progressAnim, {
            toValue: clamped,
            duration: 100,
            useNativeDriver: false,
        }).start();
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    if (!lesson) {
        return (
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No lesson loaded.</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>← Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Progress Bar */}
            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.contentPad}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Lesson Header */}
                <View style={styles.lessonHeader}>
                    <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>TODAY'S LESSON</Text>
                    </View>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                </View>

                {/* Markdown Content */}
                <MarkdownDisplay style={markdownStyles}>
                    {lesson.content_markdown}
                </MarkdownDisplay>

                {/* CTA */}
                <View style={styles.quizCta}>
                    <Text style={styles.quizCtaEmoji}>🧠</Text>
                    <Text style={styles.quizCtaTitle}>Ready to test your knowledge?</Text>
                    <Text style={styles.quizCtaDesc}>
                        You've done the reading! Now take a quick 3-question quiz to lock in what you learned.
                    </Text>
                    <TouchableOpacity
                        style={styles.quizButton}
                        onPress={() => setQuizVisible(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.quizButtonText}>Start Quiz →</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Progress % Indicator */}
            <View style={styles.progressLabel}>
                <Text style={styles.progressLabelText}>{Math.round(progress * 100)}% read</Text>
            </View>

            {/* Quiz Modal */}
            <QuizModal
                visible={quizVisible}
                questions={lesson.quiz_data}
                onClose={() => setQuizVisible(false)}
                onComplete={() => {
                    setQuizVisible(false);
                    navigation.navigate('Dashboard');
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.border,
        marginTop: 0,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    scroll: { flex: 1 },
    contentPad: {
        padding: SPACING.lg,
        paddingBottom: 60,
    },
    lessonHeader: {
        marginBottom: SPACING.lg,
    },
    topicBadge: {
        backgroundColor: `${COLORS.primary}20`,
        alignSelf: 'flex-start',
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    topicBadgeText: {
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.bold,
        color: COLORS.primaryDark,
        letterSpacing: 1,
    },
    lessonTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        lineHeight: 36,
    },
    quizCta: {
        backgroundColor: `${COLORS.primary}10`,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginTop: SPACING.xl,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: `${COLORS.primary}30`,
    },
    quizCtaEmoji: { fontSize: 40, marginBottom: SPACING.sm },
    quizCtaTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    quizCtaDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.lg,
    },
    quizButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
    },
    quizButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
    progressLabel: {
        position: 'absolute',
        bottom: 16,
        right: SPACING.md,
        backgroundColor: COLORS.textDark,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        opacity: 0.7,
    },
    progressLabelText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.medium,
    },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textMedium },
    backBtn: { marginTop: SPACING.md },
    backBtnText: { color: COLORS.primary, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
});

const markdownStyles = {
    body: { fontSize: 16, color: COLORS.textDark, lineHeight: 26 },
    heading1: { fontSize: 22, fontWeight: '700' as const, color: COLORS.textDark, marginVertical: 12 },
    heading2: { fontSize: 18, fontWeight: '700' as const, color: COLORS.textDark, marginVertical: 10 },
    heading3: { fontSize: 16, fontWeight: '600' as const, color: COLORS.textDark, marginVertical: 8 },
    strong: { fontWeight: '700' as const },
    em: { fontStyle: 'italic' as const },
    blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
        paddingLeft: 12,
        marginVertical: 8,
        backgroundColor: `${COLORS.primary}08`,
    },
    bullet_list: { marginVertical: 8 },
    list_item: { marginVertical: 4 },
    code_inline: {
        backgroundColor: COLORS.background,
        borderRadius: 4,
        paddingHorizontal: 4,
        fontFamily: 'monospace',
    },
};
