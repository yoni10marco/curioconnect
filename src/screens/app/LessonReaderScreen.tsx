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
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    // quiz_data may arrive from Supabase as a JSON string on web — parse it
    const lessonPages = React.useMemo(() => {
        if (!lesson) return [];
        let data = lesson.quiz_data as any[];

        // Handle gracefully if parsing failed in store for some wild reason
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch { data = []; }
        }

        // Fallback for old lessons stored in the DB (just an array of questions)
        if (data.length > 0 && !data[0].text) {
            return [{
                text: lesson.content_markdown,
                questions: data
            }];
        }
        return data; // Array of PageData { text: string, questions: QuizQuestion[] }
    }, [lesson]);

    const activePage = lessonPages[currentPageIndex];

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const scrolled = contentOffset.y / (contentSize.height - layoutMeasurement.height);
        // If content is shorter than screen, it might divide by zero or negative
        const clamped = contentSize.height > layoutMeasurement.height
            ? Math.max(0, Math.min(1, scrolled))
            : 1;
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

    if (!lesson || !activePage) {
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
                ref={scrollViewRef}
                style={styles.scroll}
                contentContainerStyle={styles.contentPad}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {/* Lesson Header */}
                <View style={styles.lessonHeader}>
                    <View style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>
                            PAGE {currentPageIndex + 1} OF {lessonPages.length}
                        </Text>
                    </View>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                </View>

                {/* Markdown Content */}
                <MarkdownDisplay style={markdownStyles}>
                    {activePage.text}
                </MarkdownDisplay>

                {/* CTA */}
                <View style={styles.quizCta}>
                    <Text style={styles.quizCtaEmoji}>🧠</Text>
                    <Text style={styles.quizCtaTitle}>Ready to test your knowledge?</Text>
                    <Text style={styles.quizCtaDesc}>
                        {currentPageIndex < lessonPages.length - 1
                            ? "Take a quick 2-question quiz to unlock the next page."
                            : "Take the final quiz to complete this lesson!"}
                    </Text>
                    <TouchableOpacity
                        style={styles.quizButton}
                        onPress={() => setQuizVisible(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.quizButtonText}>
                            {currentPageIndex < lessonPages.length - 1 ? 'Take Page Quiz →' : 'Take Final Quiz →'}
                        </Text>
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
                questions={activePage.questions || []}
                isFinalPage={currentPageIndex === lessonPages.length - 1}
                onClose={() => setQuizVisible(false)}
                onComplete={() => {
                    setQuizVisible(false);
                    if (currentPageIndex === lessonPages.length - 1) {
                        navigation.navigate('Dashboard');
                    } else {
                        // Go to next page
                        setCurrentPageIndex(prev => prev + 1);
                        // Reset scroll & progress instantly
                        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                        setProgress(0);
                        progressAnim.setValue(0);
                    }
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
