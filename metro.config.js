const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-font's web-specific files call registerWebModule() from expo-modules-core,
// which doesn't exist in Expo SDK 51. Return empty modules for those files on web
// so the app doesn't crash. Fonts may not load on web but the app will run.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && /expo-font\/build\/Expo.*\.web/.test(moduleName)) {
        return { type: 'empty' };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
