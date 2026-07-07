import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './139';
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

const ACCOUNT_2_ID = 'account-uuid-2';
const ACCOUNT_2_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const USDC_CAIP19_MAINNET = `eip155:1/erc20:${USDC_ADDRESS}`;
const DAI_CAIP19_MAINNET = `eip155:1/erc20:${DAI_ADDRESS}`;

const SOL_USDC_ASSET_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_NATIVE_ASSET_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

interface TestAssetsController {
  assetsInfo: Record<string, unknown>;
  assetsBalance: Record<string, Record<string, unknown>>;
  assetsPrice: Record<string, unknown>;
  customAssets: Record<string, string[]>;
  assetPreferences: Record<string, unknown>;
  selectedCurrency: string;
}

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
}

function buildState(
  backgroundStateOverrides: Record<string, unknown> = {},
  options: { selectedAccount?: string } = {},
): TestState {
  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            selectedAccount: options.selectedAccount ?? ACCOUNT_1_ID,
            accounts: {
              [ACCOUNT_1_ID]: {
                id: ACCOUNT_1_ID,
                address: ACCOUNT_1_ADDRESS,
              },
              [ACCOUNT_2_ID]: {
                id: ACCOUNT_2_ID,
                address: ACCOUNT_2_ADDRESS,
              },
            },
          },
        },
        ...backgroundStateOverrides,
      },
    },
  };
}

function getAssetsController(state: TestState): TestAssetsController {
  return state.engine.backgroundState.AssetsController as TestAssetsController;
}

describe(`Migration ${migrationVersion}: Consolidate imported asset state`, () => {
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

  it('creates AssetsController if it is missing', () => {
    const state = buildState();

    const result = migrate(state);

    expect(result).toBe(state);
    expect(getAssetsController(state)).toMatchObject({
      assetsInfo: {},
      assetsBalance: {},
      assetsPrice: {},
      customAssets: {},
      assetPreferences: {},
      selectedCurrency: 'usd',
    });
  });

  it('adds EVM ERC-20 tokens to customAssets and assetsInfo', () => {
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              {
                address: USDC_ADDRESS,
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
                image: 'https://example.com/usdc.png',
                aggregators: ['1inch', 'Uniswap'],
              },
            ],
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [ACCOUNT_1_ADDRESS]: {
            '0x1': { [USDC_ADDRESS]: '0x5f5e100' },
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      USDC_CAIP19_MAINNET,
    );
    expect(
      assetsController.assetsBalance[ACCOUNT_1_ID]?.[USDC_CAIP19_MAINNET],
    ).toBeUndefined();
    expect(assetsController.assetsInfo[USDC_CAIP19_MAINNET]).toMatchObject({
      type: 'erc20',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      image: 'https://example.com/usdc.png',
      aggregators: ['1inch', 'Uniswap'],
    });
  });

  it('falls back to symbol when token name is missing', () => {
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              { address: DAI_ADDRESS, symbol: 'DAI', decimals: 18 },
            ],
          },
        },
      },
    });

    migrate(state);

    expect(
      getAssetsController(state).assetsInfo[DAI_CAIP19_MAINNET],
    ).toMatchObject({
      type: 'erc20',
      symbol: 'DAI',
      name: 'DAI',
      decimals: 18,
    });
  });

  it('skips ERC-721 tokens', () => {
    const nftAddress = '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D';
    const nftAssetId = `eip155:1/erc20:${nftAddress}`;
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              {
                address: nftAddress,
                symbol: 'BAYC',
                decimals: 0,
                isERC721: true,
              },
            ],
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[nftAssetId]).toBeUndefined();
    expect(assetsController.customAssets[ACCOUNT_1_ID] ?? []).not.toContain(
      nftAssetId,
    );
  });

  it('skips malformed EVM tokens', () => {
    const state = buildState({
      TokensController: {
        allTokens: {
          notHex: {
            [ACCOUNT_1_ADDRESS]: [
              { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
            ],
          },
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              { address: 'not-an-address', symbol: 'BAD', decimals: 18 },
            ],
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo).toStrictEqual({});
    expect(assetsController.customAssets).toStrictEqual({});
  });

  it('handles multiple accounts and chains', () => {
    const usdcCaip19Polygon = `eip155:137/erc20:${USDC_ADDRESS}`;
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
            ],
            [ACCOUNT_2_ADDRESS]: [
              { address: DAI_ADDRESS, symbol: 'DAI', decimals: 18 },
            ],
          },
          '0x89': {
            [ACCOUNT_1_ADDRESS]: [
              { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
            ],
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toEqual(
      expect.arrayContaining([USDC_CAIP19_MAINNET, usdcCaip19Polygon]),
    );
    expect(assetsController.customAssets[ACCOUNT_2_ID]).toContain(
      DAI_CAIP19_MAINNET,
    );
  });

  it('does not overwrite existing assetsInfo entries', () => {
    const existingMetadata = {
      type: 'erc20',
      symbol: 'USDC-API',
      name: 'USD Coin from API',
      decimals: 6,
    };
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              {
                address: USDC_ADDRESS,
                symbol: 'USDC-OLD',
                decimals: 6,
                name: 'Old',
              },
            ],
          },
        },
      },
      AssetsController: {
        assetsInfo: { [USDC_CAIP19_MAINNET]: existingMetadata },
        assetsBalance: {},
        customAssets: {},
      },
    });

    migrate(state);

    expect(
      getAssetsController(state).assetsInfo[USDC_CAIP19_MAINNET],
    ).toStrictEqual(existingMetadata);
  });

  it('does not duplicate existing customAssets entries', () => {
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              { address: DAI_ADDRESS, symbol: 'DAI', decimals: 18 },
            ],
          },
        },
      },
      AssetsController: {
        assetsInfo: {},
        assetsBalance: {},
        customAssets: { [ACCOUNT_1_ID]: [DAI_CAIP19_MAINNET] },
      },
    });

    migrate(state);

    const matchingEntries = getAssetsController(state).customAssets[
      ACCOUNT_1_ID
    ].filter((assetId) => assetId === DAI_CAIP19_MAINNET);
    expect(matchingEntries).toHaveLength(1);
  });

  it('does not add customAssets when the asset already exists in assetsBalance', () => {
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [ACCOUNT_1_ADDRESS]: [
              { address: DAI_ADDRESS, symbol: 'DAI', decimals: 18 },
            ],
          },
        },
      },
      AssetsController: {
        assetsInfo: {},
        assetsBalance: {
          [ACCOUNT_1_ID]: { [DAI_CAIP19_MAINNET]: { amount: '42' } },
        },
        customAssets: {},
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID] ?? []).not.toContain(
      DAI_CAIP19_MAINNET,
    );
    expect(
      assetsController.assetsBalance[ACCOUNT_1_ID][DAI_CAIP19_MAINNET],
    ).toEqual({ amount: '42' });
  });

  it('adds SPL/non-EVM tokens to customAssets and assetsInfo', () => {
    const state = buildState({
      MultichainAssetsController: {
        accountsAssets: { [ACCOUNT_1_ID]: [SOL_USDC_ASSET_ID] },
        assetsMetadata: {
          [SOL_USDC_ASSET_ID]: {
            fungible: true,
            name: 'USD Coin',
            symbol: 'USDC',
            iconUrl: 'https://example.com/usdc.png',
            units: [{ decimals: 6, symbol: 'USDC' }],
          },
        },
      },
      MultichainBalancesController: {
        balances: {
          [ACCOUNT_1_ID]: {
            [SOL_USDC_ASSET_ID]: { amount: '500.5', unit: 'USDC' },
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      SOL_USDC_ASSET_ID,
    );
    expect(
      assetsController.assetsBalance[ACCOUNT_1_ID]?.[SOL_USDC_ASSET_ID],
    ).toBeUndefined();
    expect(assetsController.assetsInfo[SOL_USDC_ASSET_ID]).toMatchObject({
      type: 'spl',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      image: 'https://example.com/usdc.png',
    });
  });

  it('writes placeholder metadata when snap metadata is missing', () => {
    const state = buildState({
      MultichainAssetsController: {
        accountsAssets: { [ACCOUNT_1_ID]: [SOL_USDC_ASSET_ID] },
        assetsMetadata: {},
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[SOL_USDC_ASSET_ID]).toMatchObject({
      type: 'spl',
      symbol: '',
      name: '',
      decimals: 0,
    });
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      SOL_USDC_ASSET_ID,
    );
  });

  it('skips native slip44 assets', () => {
    const state = buildState({
      MultichainAssetsController: {
        accountsAssets: {
          [ACCOUNT_1_ID]: [SOL_NATIVE_ASSET_ID, SOL_USDC_ASSET_ID],
        },
        assetsMetadata: {
          [SOL_NATIVE_ASSET_ID]: {
            fungible: true,
            symbol: 'SOL',
            units: [{ decimals: 9 }],
          },
          [SOL_USDC_ASSET_ID]: {
            fungible: true,
            symbol: 'USDC',
            units: [{ decimals: 6 }],
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[SOL_NATIVE_ASSET_ID]).toBeUndefined();
    expect(assetsController.customAssets[ACCOUNT_1_ID] ?? []).not.toContain(
      SOL_NATIVE_ASSET_ID,
    );
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      SOL_USDC_ASSET_ID,
    );
  });

  it('does not create customAssets for accounts holding only native assets', () => {
    const state = buildState({
      MultichainAssetsController: {
        accountsAssets: {
          [ACCOUNT_1_ID]: [SOL_USDC_ASSET_ID],
          [ACCOUNT_2_ID]: [SOL_NATIVE_ASSET_ID],
        },
        assetsMetadata: {},
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      SOL_USDC_ASSET_ID,
    );
    expect(assetsController.customAssets[ACCOUNT_2_ID]).toBeUndefined();
  });

  it('gates per-account writes to relevant accounts', () => {
    const state = buildState(
      {
        TokensController: {
          allTokens: {
            '0x1': {
              [ACCOUNT_1_ADDRESS]: [
                { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
              ],
            },
          },
        },
      },
      { selectedAccount: ACCOUNT_1_ID },
    );

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      USDC_CAIP19_MAINNET,
    );
    expect(assetsController.customAssets[ACCOUNT_2_ID]).toBeUndefined();
  });

  it('migrates non-selected accounts that have imported tokens', () => {
    const state = buildState(
      {
        TokensController: {
          allTokens: {
            '0x1': {
              [ACCOUNT_1_ADDRESS]: [
                { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
              ],
            },
          },
        },
      },
      { selectedAccount: ACCOUNT_2_ID },
    );

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toContain(
      USDC_CAIP19_MAINNET,
    );
    expect(assetsController.customAssets[ACCOUNT_2_ID]).toBeUndefined();
  });

  it('writes metadata but no customAssets for unknown EVM addresses', () => {
    const unknownAddress = '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead';
    const state = buildState({
      TokensController: {
        allTokens: {
          '0x1': {
            [unknownAddress]: [
              { address: USDC_ADDRESS, symbol: 'USDC', decimals: 6 },
            ],
          },
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo[USDC_CAIP19_MAINNET]).toBeDefined();
    expect(Object.keys(assetsController.customAssets)).toHaveLength(0);
  });

  it('cleans up pre-existing native slip44 customAssets entries', () => {
    const nativeEthMainnetAssetId = 'eip155:1/slip44:60';
    const state = buildState({
      AssetsController: {
        assetsInfo: {},
        assetsBalance: {},
        customAssets: {
          [ACCOUNT_1_ID]: [
            SOL_USDC_ASSET_ID,
            nativeEthMainnetAssetId,
            USDC_CAIP19_MAINNET,
          ],
          [ACCOUNT_2_ID]: [SOL_NATIVE_ASSET_ID, SOL_USDC_ASSET_ID],
        },
      },
    });

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.customAssets[ACCOUNT_1_ID]).toStrictEqual([
      SOL_USDC_ASSET_ID,
      USDC_CAIP19_MAINNET,
    ]);
    expect(assetsController.customAssets[ACCOUNT_2_ID]).toStrictEqual([
      SOL_USDC_ASSET_ID,
    ]);
  });

  it('does not add migrated entries when source controllers are absent', () => {
    const state = buildState();

    migrate(state);

    const assetsController = getAssetsController(state);
    expect(assetsController.assetsInfo).toStrictEqual({});
    expect(assetsController.customAssets).toStrictEqual({});
    expect(assetsController.assetsBalance).toStrictEqual({});
  });

  it('captures exceptions and returns state on unexpected errors', () => {
    const backgroundState = new Proxy({} as Record<string, unknown>, {
      set() {
        throw new Error('Unexpected migration failure');
      },
    });
    const state: TestState = {
      engine: { backgroundState },
    };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          `Migration ${migrationVersion}: Failed to consolidate asset state`,
        ),
      }),
    );
  });
});
