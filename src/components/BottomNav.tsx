import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../navigation';
import { COLORS, FONTS, SPACING } from '../lib/theme';

type RouteName = 'Dashboard' | 'LearningJourney' | 'KnowledgeLibrary' | 'Leaderboard' | 'Profile';

interface Props {
    currentRoute: RouteName;
}

const TABS: { name: RouteName; label: string; emoji: string }[] = [
    { name: 'Dashboard', label: 'Home', emoji: '🏠' },
    { name: 'LearningJourney', label: 'Journey', emoji: '🗺️' },
    { name: 'KnowledgeLibrary', label: 'Library', emoji: '📚' },
    { name: 'Leaderboard', label: 'Rank', emoji: '🏆' },
    { name: 'Profile', label: 'Profile', emoji: '👤' },
];

export default function BottomNav({ currentRoute }: Props) {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    return (
        <View style={styles.container}>
            {TABS.map((tab) => {
                const isActive = currentRoute === tab.name;
                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => {
                            if (!isActive) {
                                navigation.navigate(tab.name as never);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.emoji, isActive && styles.activeEmoji]}>
                            {tab.emoji}
                        </Text>
                        <Text style={[styles.label, isActive && styles.activeLabel]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingBottom: 24, // Safe area padding for iOS
        paddingTop: SPACING.md,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 24,
        opacity: 0.5,
        marginBottom: 2,
    },
    activeEmoji: {
        opacity: 1.0,
    },
    label: {
        fontSize: 10,
        fontWeight: FONTS.weights.medium,
        color: COLORS.textMedium,
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: FONTS.weights.bold,
    },
});
