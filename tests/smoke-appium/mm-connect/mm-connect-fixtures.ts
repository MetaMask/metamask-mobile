import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';

/**
 * Fixture for browser Multichain Connect smoke tests.
 * Uses the standard e2e CI wallet plus Solana CAIP-25 permission scopes.
 *
 * Auto-lock is disabled: Chrome navigation + SDK session_request routinely
 * exceeds the default 30s lockTime, and unlocking under the Play services
 * heads-up takes long enough for "Transport request timed out" on the dapp.
 */
export function multichainBrowserFixture() {
  return new FixtureBuilder()
    .withSolanaAccountPermission()
    .withAutoLockDisabled()
    .build();
}
