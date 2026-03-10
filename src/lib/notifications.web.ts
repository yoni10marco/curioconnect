// Web stub — expo-notifications is not supported on web.
// All functions are no-ops to prevent the module from crashing on web.

export function configureNotificationHandler(): void {}
export async function requestNotificationPermissions(): Promise<boolean> { return false; }
export async function scheduleMorningNotificationForToday(): Promise<string | null> { return null; }
export async function scheduleEveningNotificationForToday(): Promise<string | null> { return null; }
export async function cancelMorningNotification(): Promise<void> {}
export async function cancelEveningNotification(): Promise<void> {}
export async function cancelTodayNotifications(): Promise<void> {}
export async function cancelAllNotifications(): Promise<void> {}
export async function initializeNotifications(_isLessonCompleted: boolean): Promise<void> {}
