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

const path = require('path');

const SMART_TRANSPORT_PATH = path.resolve(__dirname, 'SmartTransport.ts');

function withSpeculosTransport(baseConfig) {
  if (process.env.NODE_ENV === 'production') {
    return baseConfig;
  }

  return {
    ...baseConfig,
    resolver: {
      ...baseConfig.resolver,
      extraNodeModules: {
        ...(baseConfig.resolver?.extraNodeModules || {}),
        '@ledgerhq/react-native-hw-transport-ble': SMART_TRANSPORT_PATH,
      },
    },
  };
}

module.exports = { withSpeculosTransport };
