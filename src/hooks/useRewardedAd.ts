import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type RewardCallback = () => void;

/**
 * Hook for showing a rewarded ad. Loads the ad on mount and reloads after each show.
 * On web, `show` is a no-op and `isLoaded` is always false.
 *
 * @param adUnitId - The AdMob ad unit ID
 * @param onRewarded - Called when the user earns the reward
 */
export function useRewardedAd(adUnitId: string, onRewarded: RewardCallback) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const adRef = useRef<any>(null);
    const onRewardedRef = useRef(onRewarded);
    onRewardedRef.current = onRewarded;

    useEffect(() => {
        if (Platform.OS === 'web') return;

        let unsubscribeLoaded: (() => void) | undefined;
        let unsubscribeEarned: (() => void) | undefined;
        let unsubscribeClosed: (() => void) | undefined;

        async function load() {
            try {
                setIsLoading(true);
                const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
                const ad = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: false });
                adRef.current = ad;

                unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
                    setIsLoaded(true);
                    setIsLoading(false);
                });
                unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
                    onRewardedRef.current();
                });
                unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
                    setIsLoaded(false);
                    // Reload for next use
                    ad.load();
                });

                ad.load();
            } catch {
                setIsLoading(false);
            }
        }

        load();

        return () => {
            unsubscribeLoaded?.();
            unsubscribeEarned?.();
            unsubscribeClosed?.();
        };
    }, [adUnitId]);

    const show = async () => {
        if (Platform.OS === 'web' || !adRef.current || !isLoaded) return;
        try {
            await adRef.current.show();
        } catch {
            // Ad failed to show — silently ignore
        }
    };

    return { show, isLoaded, isLoading };
}
