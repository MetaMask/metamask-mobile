import { cloneDeep } from 'lodash';
import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './144';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const ACCOUNT_1_ID = 'account-uuid-1';
const ACCOUNT_1_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

// Flare (chainId 14 / 0xe) — a niche chain not covered by the accounts API.
const FLARE_HEX = '0xe';
// WFLR (checksummed).
const WFLR_ADDRESS = '0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d';
const WFLR_CAIP19 = `eip155:14/erc20:${WFLR_ADDRESS}`;

interface TestAssetsController {
  assetsInfo: Record<string, unknown>;
  assetsBalance: Record<string, Record<string, { amount: string }>>;
  customAssets: Record<string, string[]>;
  assetPreferences: Record<string, { hidden?: boolean }>;
}

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
}

function buildBaseState(
  backgroundStateOverrides: Record<string, unknown> = {},
): TestState {
  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: ACCOUNT_1_ID,
            accounts: {
              [ACCOUNT_1_ID]: {
                id: ACCOUNT_1_ID,
                address: ACCOUNT_1_ADDRESS,
                type: 'eip155:eoa',
              },
            },
          },
        },
        ...backgroundStateOverrides,
      },
    },
  };
}

/**
 * Build state with an AssetsController whose Flare metadata was wiped: the WFLR
 * asset is still tracked (customAssets + assetsBalance) but has no assetsInfo
 * entry, while the legacy TokensController still holds the metadata.
 *
 * @param acOverrides - Partial AssetsController state to merge in.
 * @param extra - Extra top-level controller state to merge in.
 */
function buildWipedFlareState(
  acOverrides: Partial<TestAssetsController> = {},
  extra: Record<string, unknown> = {},
): TestState {
  return buildBaseState({
    TokensController: {
      allTokens: {
        [FLARE_HEX]: {
          [ACCOUNT_1_ADDRESS]: [
            { address: WFLR_ADDRESS, symbol: 'WFLR', decimals: 18 },
          ],
        },
      },
    },
    AssetsController: {
      assetsInfo: {}, // AssetsInfo is wiped
      assetsBalance: {
        [ACCOUNT_1_ID]: { [WFLR_CAIP19]: { amount: '100' } },
      },
      customAssets: { [ACCOUNT_1_ID]: [WFLR_CAIP19] },
      assetPreferences: {},
      ...acOverrides,
    },
    ...extra,
  });
}

function getAssetsController(state: TestState): TestAssetsController {
  return state.engine.backgroundState.AssetsController as TestAssetsController;
}

describe(`Migration ${migrationVersion}: heal wiped niche-chain token metadata`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('returns state unchanged if ensureValidState returns false', () => {
    const state = { some: 'state' };
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedEnsureValidState).toHaveBeenCalledWith(
      state,
      migrationVersion,
    );
  });

  it('restores wiped assetsInfo metadata for a niche-chain token', () => {
    const state = cloneDeep(buildWipedFlareState());

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toStrictEqual({
      type: 'erc20',
      symbol: 'WFLR',
      name: 'WFLR',
      decimals: 18,
    });
  });

  const customAssetsTestCases = [
    {
      name: 'leaves customAssets untouched when the asset already has a balance entry',
      state: () => {
        const s = buildWipedFlareState();
        (
          s.engine.backgroundState.AssetsController as TestAssetsController
        ).assetsBalance = {
          [ACCOUNT_1_ID]: { [WFLR_CAIP19]: { amount: '100' } },
        };
        return s;
      },
    },
    {
      name: 'adds the asset to customAssets when tracking was lost',
      state: () => {
        const s = buildWipedFlareState();
        (
          s.engine.backgroundState.AssetsController as TestAssetsController
        ).assetsBalance = {};
        return s;
      },
    },
  ];

  it.each(customAssetsTestCases)(
    'customAssetsTestCases - $name',
    ({ state }) => {
      const testState = cloneDeep(state());

      migrate(testState);

      expect(
        getAssetsController(testState).customAssets[ACCOUNT_1_ID],
      ).toStrictEqual([WFLR_CAIP19]);
    },
  );

  it('restores metadata even for an account not in internalAccounts (global registry)', () => {
    const state = cloneDeep(
      buildWipedFlareState(
        { assetsBalance: {}, customAssets: {} },
        {
          AccountsController: {
            internalAccounts: { selectedAccount: '', accounts: {} },
          },
        },
      ),
    );

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[WFLR_CAIP19]).toBeDefined();
    // No account mapping → nothing added to customAssets.
    expect(assetsController.customAssets).toStrictEqual({});
  });

  const accountsApiNetworkTestCases = [
    { hexChainId: '0x1', chainName: 'Ethereum' },
    { hexChainId: '0xa', chainName: 'Optimism' },
    { hexChainId: '0x38', chainName: 'BNB Smart Chain' },
    { hexChainId: '0x89', chainName: 'Polygon' },
    { hexChainId: '0x8f', chainName: 'Monad' },
    { hexChainId: '0x3e7', chainName: 'HyperEVM' },
    { hexChainId: '0x531', chainName: 'Sei' },
    { hexChainId: '0x13b2', chainName: 'Arc' },
    { hexChainId: '0x2105', chainName: 'Base' },
    { hexChainId: '0xa4b1', chainName: 'Arbitrum One' },
    { hexChainId: '0xa86a', chainName: 'Avalanche' },
    { hexChainId: '0xe708', chainName: 'Linea' },
  ];

  it.each(accountsApiNetworkTestCases)(
    'does not touch the accounts-API-supported network $chainName',
    ({ hexChainId }) => {
      const state = cloneDeep(
        buildBaseState({
          TokensController: {
            allTokens: {
              [hexChainId]: {
                [ACCOUNT_1_ADDRESS]: [
                  {
                    address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
                    symbol: 'TKN',
                    decimals: 6,
                  },
                ],
              },
            },
          },
          AssetsController: {
            assetsInfo: {},
            assetsBalance: {},
            customAssets: {},
            assetPreferences: {},
          },
        }),
      );

      migrate(state);

      expect(Object.keys(getAssetsController(state).assetsInfo)).toHaveLength(
        0,
      );
    },
  );

  it('heals custom networks not supported by the accounts API (e.g. zkSync Era)', () => {
    // zkSync Era (chainId 324 / 0x144) is absent from
    // ACCOUNT_API_SUPPORTED_CHAIN_IDS, so it is treated as a custom chain.
    const ZKSYNC_HEX = '0x144';
    const TOKEN_ADDRESS = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
    const state = cloneDeep(
      buildBaseState({
        TokensController: {
          allTokens: {
            [ZKSYNC_HEX]: {
              [ACCOUNT_1_ADDRESS]: [
                { address: TOKEN_ADDRESS, symbol: 'TKN', decimals: 6 },
              ],
            },
          },
        },
        AssetsController: {
          assetsInfo: {},
          assetsBalance: {},
          customAssets: {},
          assetPreferences: {},
        },
      }),
    );

    migrate(state);

    const assetsController = getAssetsController(state);
    const assetIds = Object.keys(assetsController.assetsInfo);
    expect(assetIds).toHaveLength(1);
    expect(assetIds[0]).toMatch(/^eip155:324\/erc20:/u);
    expect(assetsController.assetsInfo[assetIds[0]]).toStrictEqual({
      type: 'erc20',
      symbol: 'TKN',
      name: 'TKN',
      decimals: 6,
    });
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(assetIds[0]);
  });

  it('skips tokens hidden in the legacy allIgnoredTokens', () => {
    const state = cloneDeep(
      buildWipedFlareState(
        { assetsBalance: {}, customAssets: {} },
        {
          TokensController: {
            allTokens: {
              [FLARE_HEX]: {
                [ACCOUNT_1_ADDRESS]: [
                  { address: WFLR_ADDRESS, symbol: 'WFLR', decimals: 18 },
                ],
              },
            },
            allIgnoredTokens: {
              [FLARE_HEX]: {
                // Stored lowercase by TokensController.
                [ACCOUNT_1_ADDRESS]: [WFLR_ADDRESS.toLowerCase()],
              },
            },
          },
        },
      ),
    );

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[WFLR_CAIP19]).toBeUndefined();
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toBeUndefined();
  });

  it('skips tokens hidden via assetPreferences in the new controller', () => {
    const state = cloneDeep(
      buildWipedFlareState({
        assetsBalance: {},
        customAssets: {},
        assetPreferences: { [WFLR_CAIP19]: { hidden: true } },
      }),
    );

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toBeUndefined();
  });

  it('matches assetPreferences case-insensitively (lowercase hidden key)', () => {
    const state = cloneDeep(
      buildWipedFlareState({
        assetsBalance: {},
        customAssets: {},
        assetPreferences: { [WFLR_CAIP19.toLowerCase()]: { hidden: true } },
      }),
    );

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toBeUndefined();
  });

  it('never overwrites an existing assetsInfo entry', () => {
    const existing = {
      type: 'erc20',
      symbol: 'WFLR-RICH',
      name: 'Wrapped Flare (rich)',
      decimals: 18,
      image: 'https://example.com/wflr.png',
    };
    const state = cloneDeep(
      buildWipedFlareState({ assetsInfo: { [WFLR_CAIP19]: existing } }),
    );

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toStrictEqual(
      existing,
    );
  });

  it('skips ERC-721 tokens', () => {
    const state = cloneDeep(
      buildWipedFlareState(
        { assetsBalance: {}, customAssets: {} },
        {
          TokensController: {
            allTokens: {
              [FLARE_HEX]: {
                [ACCOUNT_1_ADDRESS]: [
                  {
                    address: WFLR_ADDRESS,
                    symbol: 'NFT',
                    decimals: 0,
                    isERC721: true,
                  },
                ],
              },
            },
          },
        },
      ),
    );

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toBeUndefined();
  });

  it('does nothing when AssetsController state is absent', () => {
    const state = cloneDeep(
      buildBaseState({
        TokensController: {
          allTokens: {
            [FLARE_HEX]: {
              [ACCOUNT_1_ADDRESS]: [
                { address: WFLR_ADDRESS, symbol: 'WFLR', decimals: 18 },
              ],
            },
          },
        },
      }),
    );

    migrate(state);

    expect(state.engine.backgroundState.AssetsController).toBeUndefined();
  });

  it('falls back to symbol when token name is missing and preserves image/aggregators', () => {
    const state = cloneDeep(
      buildWipedFlareState(
        { assetsBalance: {}, customAssets: {} },
        {
          TokensController: {
            allTokens: {
              [FLARE_HEX]: {
                [ACCOUNT_1_ADDRESS]: [
                  {
                    address: WFLR_ADDRESS,
                    symbol: 'WFLR',
                    decimals: 18,
                    image: 'https://example.com/wflr.png',
                    aggregators: ['CoinGecko'],
                  },
                ],
              },
            },
          },
        },
      ),
    );

    migrate(state);

    expect(getAssetsController(state).assetsInfo[WFLR_CAIP19]).toStrictEqual({
      type: 'erc20',
      symbol: 'WFLR',
      name: 'WFLR',
      decimals: 18,
      image: 'https://example.com/wflr.png',
      aggregators: ['CoinGecko'],
    });
  });

  it('captures and swallows errors thrown during healing', () => {
    const state = cloneDeep(buildBaseState());
    // Force a throw when the migration reads assetsInfo.
    state.engine.backgroundState.AssetsController = {
      get assetsInfo() {
        throw new Error('boom');
      },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration #${migrationVersion} - heal wiped AssetsController metadata for niche-chain tokens failed`,
        ),
      }),
    );
  });
});
