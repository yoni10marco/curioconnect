import React from 'react';
import { View, StyleSheet } from 'react-native';
import ComingSoon from '../../components/ComingSoon';
import { COLORS } from '../../lib/theme';

export default function LearningJourneyScreen() {
    return (
        <View style={styles.container}>
            <ComingSoon
                title="Learning Journey"
                description="Visualize your path from beginner to expert. See how your daily habits physically build out your unique knowledge tree."
                icon="map-search-outline"
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
