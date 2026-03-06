import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../lib/theme';

interface Props {
    title: string;
    description?: string;
    icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export default function ComingSoon({ title, description, icon = 'rocket-launch-outline' }: Props) {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name={icon} size={64} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>COMING SOON</Text>
                </View>
                {description && <Text style={styles.description}>{description}</Text>}

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    content: {
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        width: '100%',
        shadowColor: COLORS.textDark,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    badge: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: SPACING.md,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
        marginBottom: SPACING.lg,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.xs,
        fontWeight: FONTS.weights.bold,
        letterSpacing: 1,
    },
    description: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: SPACING.xl,
    },
    backButton: {
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backButtonText: {
        color: COLORS.textDark,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.semibold,
    },
});
