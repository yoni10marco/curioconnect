import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
    title: string;
    description?: string;
    icon?: keyof typeof Ionicons.glyphMap;
};

export default function ComingSoon({
    title,
    description = "We're working hard to bring this feature to life. Check back later!",
    icon = 'construct-outline',
}: Props) {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Dashboard' as never)}
                activeOpacity={0.8}
            >
                <Text style={styles.buttonText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${COLORS.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    description: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
});
