import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';

/**
 * Fixture for browser Multichain Connect smoke tests.
 * Uses the standard e2e CI wallet plus Solana CAIP-25 permission scopes.
 */
export function multichainBrowserFixture() {
  return new FixtureBuilder().withSolanaAccountPermission().build();
}
