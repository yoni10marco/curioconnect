import { Platform } from 'react-native';
import MobileAds from 'react-native-google-mobile-ads';

export const MAX_FREEZE = 3;

// Initialize AdMob SDK (call once at app start; safe to call multiple times)
if (Platform.OS !== 'web') {
    try {
        MobileAds().initialize();
    } catch (e) {
        // Prevent crash if AdMob fails to initialize
        console.warn('AdMob init failed:', e);
    }
}

// TODO: replace all placeholder IDs with your real AdMob ad unit IDs before release
// Each placement has its own ad unit for separate analytics and tuning

export const AD_UNITS = {
    freeze: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA'               // iOS — freeze ad unit
        : 'ca-app-pub-2213890156530970/1632214937',              // Android — freeze ad unit

    doubleXp: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/CCCCCCCCCC'               // iOS — double XP ad unit (TEST)
        : 'ca-app-pub-2213890156530970/8085942640',              // Android — double XP ad unit

    bonusLesson: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/EEEEEEEEEE'               // iOS — bonus lesson ad unit (TEST)
        : 'ca-app-pub-2213890156530970/9841877441',              // Android — bonus lesson ad unit
};
