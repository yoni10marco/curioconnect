import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../navigation';
import { COLORS, FONTS, SPACING } from '../lib/theme';

type RouteName = 'Dashboard' | 'LearningJourney' | 'KnowledgeLibrary' | 'Leaderboard' | 'Profile';

interface Props {
    currentRoute: RouteName;
}

const TABS: { name: RouteName; label: string; icon: keyof typeof Ionicons.glyphMap; iconActive: keyof typeof Ionicons.glyphMap }[] = [
    { name: 'Dashboard', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { name: 'LearningJourney', label: 'Journey', icon: 'compass-outline', iconActive: 'compass' },
    { name: 'KnowledgeLibrary', label: 'Library', icon: 'library-outline', iconActive: 'library' },
    { name: 'Leaderboard', label: 'Ranks', icon: 'trophy-outline', iconActive: 'trophy' },
    { name: 'Profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
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
                        <Ionicons
                            name={isActive ? tab.iconActive : tab.icon}
                            size={24}
                            color={isActive ? COLORS.primary : COLORS.textLight}
                            style={styles.icon}
                        />
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
        paddingBottom: 24,
        paddingTop: SPACING.md,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        marginBottom: 2,
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
