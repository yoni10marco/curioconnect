import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaProvider style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <RootNavigator />
        </SafeAreaProvider>
    );
}
