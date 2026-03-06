import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <View style={{ flex: 1 }}>
                    <StatusBar style="auto" />
                    <RootNavigator />
                </View>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}
