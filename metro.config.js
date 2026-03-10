const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web, expo-font calls registerWebModule() from expo-modules-core,
// which was added in SDK 52. We're on SDK 51, so it doesn't exist.
// Redirect expo-modules-core imports on web to a shim that adds the missing function.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'expo-modules-core') {
        // Only redirect if the caller is NOT our shim (avoids infinite loop)
        if (!context.originModulePath.includes('expo-modules-core-web-shim')) {
            return {
                type: 'sourceFile',
                filePath: path.resolve(__dirname, 'src/shims/expo-modules-core-web-shim.js'),
            };
        }
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
