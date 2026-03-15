import React from 'react';
import { I18nManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';

// Force LTR layout for the entire app — must run unconditionally,
// not just when isRTL is true, so the native flag is set before first render.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar style="auto" />
            <RootNavigator />
        </SafeAreaProvider>
    );
}
