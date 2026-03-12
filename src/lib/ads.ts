import { Platform } from 'react-native';
import MobileAds from 'react-native-google-mobile-ads';

export const MAX_FREEZE = 3;

// Initialize AdMob SDK (call once at app start; safe to call multiple times)
if (Platform.OS !== 'web') {
    MobileAds().initialize();
}

// TODO: replace all placeholder IDs with your real AdMob ad unit IDs before release
// Each placement has its own ad unit for separate analytics and tuning

export const AD_UNITS = {
    freeze: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA'               // iOS — freeze ad unit
        : 'ca-app-pub-3940256099942544/5224354917',              // Android — freeze ad unit (TEST)

    doubleXp: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/CCCCCCCCCC'               // iOS — double XP ad unit
        : 'ca-app-pub-3940256099942544/5224354917',              // Android — double XP ad unit (TEST)

    bonusLesson: Platform.OS === 'ios'
        ? 'ca-app-pub-XXXXXXXXXXXXXXXX/EEEEEEEEEE'               // iOS — bonus lesson ad unit
        : 'ca-app-pub-3940256099942544/5224354917',              // Android — bonus lesson ad unit (TEST)
};
