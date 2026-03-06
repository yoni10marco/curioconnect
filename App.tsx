import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation';

export default function App() {
    return (
        <View style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <RootNavigator />
        </View>
    );
}
