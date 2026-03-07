import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import BottomNav from '../../components/BottomNav';

export default function LeaderboardScreen() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.emoji}>🏆</Text>
                <Text style={styles.title}>Leaderboard</Text>
                <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
                <Text style={styles.description}>
                    Compete with friends and other learners.
                    Earn XP and climb the ranks to the top of the leaderboard!
                </Text>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                </TouchableOpacity>
            </View>
            <BottomNav currentRoute="Leaderboard" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
        padding: SPACING.xl,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    emoji: {
        fontSize: 64,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    comingSoonBadge: {
        backgroundColor: '#FFF3E0', // Light Orange
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.lg,
    },
    comingSoonText: {
        color: '#F57C00', // Dark Orange
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    description: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xl,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        width: '100%',
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
});
