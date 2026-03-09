import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_MORNING_ID = '@curioconnect/morning_notif_id';
const STORAGE_KEY_EVENING_ID = '@curioconnect/evening_notif_id';
const STORAGE_KEY_SCHEDULED_DATE = '@curioconnect/notif_scheduled_date';

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function configureNotificationHandler(): void {
  // Already configured at module load time above; calling this ensures
  // the import side-effect runs when invoked from the navigator.
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return true;
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export async function scheduleMorningNotificationForToday(): Promise<string | null> {
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(8, 0, 0, 0);

  if (trigger <= now) return null; // already past 8 AM

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ready to learn? 📚',
      body: 'Your daily lesson is waiting. Open CurioConnect and start today\'s session!',
      sound: true,
    },
    trigger: { date: trigger },
  });

  await AsyncStorage.setItem(STORAGE_KEY_MORNING_ID, id);
  return id;
}

export async function scheduleEveningNotificationForToday(): Promise<string | null> {
  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(21, 0, 0, 0);

  if (trigger <= now) return null; // already past 9 PM

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'One lesson away! ✨',
      body: "You haven't studied today yet. Take a few minutes before bed!",
      sound: true,
    },
    trigger: { date: trigger },
  });

  await AsyncStorage.setItem(STORAGE_KEY_EVENING_ID, id);
  return id;
}

export async function cancelMorningNotification(): Promise<void> {
  const id = await AsyncStorage.getItem(STORAGE_KEY_MORNING_ID);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(STORAGE_KEY_MORNING_ID);
  }
}

export async function cancelEveningNotification(): Promise<void> {
  const id = await AsyncStorage.getItem(STORAGE_KEY_EVENING_ID);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    await AsyncStorage.removeItem(STORAGE_KEY_EVENING_ID);
  }
}

export async function cancelTodayNotifications(): Promise<void> {
  await Promise.all([cancelMorningNotification(), cancelEveningNotification()]);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([
    STORAGE_KEY_MORNING_ID,
    STORAGE_KEY_EVENING_ID,
    STORAGE_KEY_SCHEDULED_DATE,
  ]);
}

export async function initializeNotifications(isLessonCompleted: boolean): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  if (isLessonCompleted) {
    await cancelTodayNotifications();
    return;
  }

  const scheduledDate = await AsyncStorage.getItem(STORAGE_KEY_SCHEDULED_DATE);
  const today = getTodayStr();

  if (scheduledDate === today) return; // already scheduled for today

  // New day or first run — clean up stale IDs and schedule fresh
  await cancelTodayNotifications();
  await scheduleMorningNotificationForToday();
  await scheduleEveningNotificationForToday();
  await AsyncStorage.setItem(STORAGE_KEY_SCHEDULED_DATE, today);
}
