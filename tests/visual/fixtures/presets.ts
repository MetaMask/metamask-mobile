import FixtureBuilder, {
  ENTROPY_WALLET_1_ID,
} from '../../framework/fixtures/FixtureBuilder';
import type {
  AccountTreeControllerState,
  Fixture,
} from '../../framework/fixtures/types';

type FixtureFn = (fb: FixtureBuilder) => FixtureBuilder;
type FixturePatchFn = (fixture: Fixture) => void;

// Minimal EVM-only account tree — maps the default EVM account into a wallet
// group so selectAssetsBySelectedAccountGroup returns EVM assets.
// Pattern taken from tests/smoke/wallet/incoming-transactions.spec.ts.
const EVM_ONLY_ACCOUNT_TREE = {
  accountTree: {
    wallets: {
      [ENTROPY_WALLET_1_ID]: {
        id: ENTROPY_WALLET_1_ID,
        type: 'Entropy',
        metadata: { name: 'Secret Recovery Phrase 1' },
        groups: {
          [`${ENTROPY_WALLET_1_ID}/account-1`]: {
            id: `${ENTROPY_WALLET_1_ID}/account-1`,
            type: 'MultipleAccount',
            accounts: ['4d7a5e0b-b261-4aed-8126-43972b0fa0a1'],
            metadata: { name: 'Account 1' },
          },
        },
      },
    },
    selectedAccountGroup: `${ENTROPY_WALLET_1_ID}/account-1`,
  },
} as unknown as Partial<AccountTreeControllerState>;

// Default fixture account address (from default-fixture.json)
const DEFAULT_ACCOUNT = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

// 10 ETH in wei (hex)
const TEN_ETH_WEI = '0x' + (BigInt(10) * BigInt(10 ** 18)).toString(16);

/**
 * Base fixtures — the starting point for a FixtureBuilder chain.
 */
const bases: Record<string, () => FixtureBuilder> = {
  default: () => new FixtureBuilder().withDefaultFixture(),
  onboarding: () => new FixtureBuilder({ onboarding: true }),
};

/**
 * Modifiers — applied in order on top of a base.
 * Each modifier receives a FixtureBuilder and returns a FixtureBuilder.
 */
const modifiers: Record<string, FixtureFn> = {
  'with-multiple-accounts': (fb) =>
    fb.withKeyringControllerOfMultipleAccounts(),
  'with-metametrics': (fb) => fb.withMetaMetricsOptIn(),
  'with-clean-banners': (fb) => fb.withCleanBannerState(),
  'with-evm-account-tree': (fb) =>
    fb
      .withAccountTreeController(EVM_ONLY_ACCOUNT_TREE)
      .withNetworkEnabledMap({ eip155: { '0x1': true } }),
};

/**
 * Post-build patches — modify the built fixture state directly.
 * Used when FixtureBuilder doesn't expose a method for the desired change.
 */
const patches: Record<string, FixturePatchFn> = {
  'with-eth-balance': (fixture) => {
    const atc = fixture.state.engine.backgroundState
      .AccountTrackerController as {
      accountsByChainId: Record<string, Record<string, { balance: string }>>;
    };
    // The default fixture stores balances under decimal key '1', but selectors
    // look up networkConfigurationsByChainId[chainId] which uses hex '0x1'.
    // Move the balance to hex key so nativeCurrency resolves to 'ETH' (not
    // 'NATIVE') and fiat conversion works correctly in the send asset list.
    if (atc?.accountsByChainId?.['1']?.[DEFAULT_ACCOUNT]) {
      atc.accountsByChainId['0x1'] = atc.accountsByChainId['0x1'] || {};
      atc.accountsByChainId['0x1'][DEFAULT_ACCOUNT] = { balance: TEN_ETH_WEI };
      delete atc.accountsByChainId['1'];
    }
  },
};

/**
 * Build a Fixture from a colon-delimited tag string.
 *
 * @param tag - e.g. "fixture:default:with-eth-balance"
 * @returns Built Fixture object ready for FixtureServer.loadJsonState()
 * @throws If the base or any modifier/patch is unknown
 */
export function buildFromTag(tag: string): Fixture {
  const segments = tag.split(':');
  const prefix = segments.shift();

  if (prefix !== 'fixture') {
    throw new Error(
      `Invalid fixture tag: "${tag}" — must start with "fixture:"`,
    );
  }

  const baseName = segments.shift();
  if (!baseName || !bases[baseName]) {
    const available = Object.keys(bases).join(', ');
    throw new Error(
      `Unknown fixture base: "${baseName}" in tag "${tag}". Available: ${available}`,
    );
  }

  let fb = bases[baseName]();
  const pendingPatches: FixturePatchFn[] = [];

  for (const mod of segments) {
    if (modifiers[mod]) {
      fb = modifiers[mod](fb);
    } else if (patches[mod]) {
      pendingPatches.push(patches[mod]);
    } else {
      const available = [
        ...Object.keys(modifiers),
        ...Object.keys(patches),
      ].join(', ');
      throw new Error(
        `Unknown fixture modifier: "${mod}" in tag "${tag}". Available: ${available}`,
      );
    }
  }

  const fixture = fb.build();

  for (const patch of pendingPatches) {
    patch(fixture);
  }

  return fixture;
}

export { bases, modifiers, patches };
