import React from 'react';
import { View, StyleSheet } from 'react-native';
import ComingSoon from '../../components/ComingSoon';
import { COLORS } from '../../lib/theme';

export default function LeaderboardScreen() {
    return (
        <View style={styles.container}>
            <ComingSoon
                title="Leaderboard"
                description="Compete with friends and other learners around the globe. See who can achieve the highest streak and most XP!"
                icon="trophy-outline"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    }
});
