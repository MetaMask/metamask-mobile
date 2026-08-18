/**
 * Dual-framework lint burndown allowlist.
 * Listed files may keep legacy FrameworkDetector / encapsulated / Playwright*
 * imports until migrated to Gestures / Assertions / Matchers.
 * Do not add new files.
 */
// eslint-disable-next-line import-x/no-commonjs
module.exports = {
  pageObjectsAndFlows: [
    'tests/flows/accounts.flow.ts',
    'tests/flows/browser.flow.ts',
    'tests/flows/general.flow.ts',
    'tests/flows/native-browser.flow.ts',
    'tests/flows/perps.flow.ts',
    'tests/flows/qr-sync.flow.ts',
    'tests/flows/wallet-home-readiness.ts',
    'tests/flows/wallet.flow.ts',
  ],
  smokeAppium: [
    'tests/smoke-appium/account-activity/web-socket-connection.spec.ts',
    'tests/smoke-appium/api-specs/helpers/transport.ts',
    'tests/smoke-appium/mm-connect/connection-evm-account.spec.ts',
    'tests/smoke-appium/mm-connect/connection-evm-session-timeout.spec.ts',
    'tests/smoke-appium/mm-connect/connection-multiclient-resilience.spec.ts',
    'tests/smoke-appium/mm-connect/connection-multiclient.spec.ts',
    'tests/smoke-appium/mm-connect/connection-wagmi-chains.spec.ts',
    'tests/smoke-appium/mm-connect/connection-wagmi.spec.ts',
    'tests/smoke-appium/mm-connect/multichain-rn-evm.spec.ts',
    'tests/smoke-appium/mm-connect/multichain-rn-solana.spec.ts',
    'tests/smoke-appium/multichain/network-expansion/multiple-provider-connections.spec.ts',
    'tests/smoke-appium/multichain/network-expansion/solana-wallet-standard.spec.ts',
    'tests/smoke-appium/perps/perps-add-funds.spec.ts',
    'tests/smoke-appium/seedless/helpers/seedless-helpers.ts',
  ],
};
