import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';

/** Tier 1 — active multichain browser test (connection-multichain.spec.ts). */
export function multichainBrowserFixture() {
  return new FixtureBuilder().withSolanaAccountPermission().build();
}

/** Tier 2/3 — placeholder until withMMConnectTestingWallet() lands (WAPI-1511). */
export function mmConnectTestingWalletFixture() {
  return new FixtureBuilder().withSolanaAccountPermission().build();
}
