import React from 'react';
import { I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';

// Force LTR layout for the entire app
if (I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
}

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar style="auto" />
            <RootNavigator />
        </SafeAreaProvider>
    );
}
