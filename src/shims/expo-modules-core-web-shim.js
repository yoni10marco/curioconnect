// Shim for expo-modules-core on web.
// registerWebModule was added in SDK 52 but we're on SDK 51.
// This wraps the real module and adds the missing function.
// We require by direct path (not module name) to avoid circular resolution.
const actual = require('../../node_modules/expo-modules-core/build/index.js');

const shim = Object.assign({}, actual, {
    registerWebModule: function (moduleClass) {
        // No-op: registerWebModule registers a native module for web.
        // We don't need this on web for SDK 51 — just return the class/object.
        return typeof moduleClass === 'function' ? new moduleClass() : moduleClass;
    },
});

module.exports = shim;
