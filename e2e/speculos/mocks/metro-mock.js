/* eslint-disable import-x/no-commonjs */
/**
 * Metro config for Speculos E2E testing.
 *
 * Replaces @ledgerhq/react-native-hw-transport-ble with SmartTransport.
 * SmartTransport auto-detects the environment at runtime:
 *   - Physical device → real BLE (pass-through, zero overhead)
 *   - Simulator + Speculos running → HTTP mock to Speculos
 *   - Simulator + no Speculos → real BLE (no-ops, same as today)
 *
 * Always active. No build flags needed.
 *
 * Usage in metro.config.js:
 *   const { withSpeculosTransport } = require('./e2e/speculos/mocks/metro-mock');
 *   module.exports = withSpeculosTransport(defaultConfig);
 */

// eslint-disable-next-line import-x/no-nodejs-modules
const path = require('path');

const SMART_TRANSPORT_PATH = path.resolve(__dirname, 'SmartTransport.ts');

function withSpeculosTransport(baseConfig) {
  if (process.env.NODE_ENV === 'production') {
    return baseConfig;
  }

  const originalResolveRequest = baseConfig.resolver?.resolveRequest;

  return {
    ...baseConfig,
    resolver: {
      ...baseConfig.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === '@ledgerhq/react-native-hw-transport-ble') {
          const origin = context.originModulePath || '';
          if (origin !== SMART_TRANSPORT_PATH) {
            return {
              type: 'sourceFile',
              filePath: SMART_TRANSPORT_PATH,
            };
          }
        }
        if (originalResolveRequest) {
          return originalResolveRequest(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withSpeculosTransport };
