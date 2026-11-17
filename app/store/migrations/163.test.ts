import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './163';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const ACCOUNT_ID = 'account-id-1';
const ACCOUNT_ADDRESS = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const FLARE_HEX = '0xe';
const MAINNET_HEX = '0x1';
const TOKEN_ADDRESS = '0x1d80c49bbbcd1c0911346656b529df9e5c2f783d';
const TOKEN_ASSET_ID =
  'eip155:14/erc20:0x1D80c49BbBCd1C0911346656B529DF9E5c2F783d';
const OTHER_TOKEN_ADDRESS = '0x96b41289d90444b8add57e6f265db5ae8651df29';

const flareToken = {
  address: TOKEN_ADDRESS,
  symbol: 'WFLR',
  name: 'Wrapped Flare',
  decimals: 18,
  image: 'https://example.com/wflr.png',
  aggregators: ['coingecko'],
};

const accountsController = {
  internalAccounts: {
    accounts: {
      [ACCOUNT_ID]: { id: ACCOUNT_ID, address: ACCOUNT_ADDRESS },
    },
    selectedAccount: ACCOUNT_ID,
  },
};

const emptyAssetsController = {
  assetsInfo: {},
  assetsBalance: {},
  assetsPrice: {},
  customAssets: {},
  assetPreferences: {},
  selectedCurrency: 'usd',
};

const createState = (backgroundState: Record<string, unknown>) => ({
  engine: { backgroundState },
});

const tokensControllerWith = (
  allTokens: Record<string, unknown>,
  allIgnoredTokens: Record<string, unknown> = {},
) => ({
  allTokens,
  allIgnoredTokens,
  allDetectedTokens: {},
});

describe(`Migration ${migrationVersion}: remove TokensController state`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 163', () => {
    expect(migrationVersion).toBe(163);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when TokensController is absent', () => {
    const state = createState({ AssetsController: emptyAssetsController });

    expect(migrate(state)).toBe(state);
  });

  it('removes TokensController and leaves other controllers untouched', () => {
    const state = createState({
      TokensController: tokensControllerWith({}),
      AssetsController: emptyAssetsController,
      OtherController: { preserved: true },
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        AssetsController: emptyAssetsController,
        OtherController: { preserved: true },
      }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('carries niche-chain tokens into AssetsController before removing TokensController', () => {
    const state = createState({
      TokensController: tokensControllerWith({
        [FLARE_HEX]: { [ACCOUNT_ADDRESS]: [flareToken] },
      }),
      AccountsController: accountsController,
      AssetsController: emptyAssetsController,
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        AccountsController: accountsController,
        AssetsController: {
          ...emptyAssetsController,
          assetsInfo: {
            [TOKEN_ASSET_ID]: {
              type: 'erc20',
              symbol: 'WFLR',
              name: 'Wrapped Flare',
              decimals: 18,
              image: 'https://example.com/wflr.png',
              aggregators: ['coingecko'],
            },
          },
          customAssets: { [ACCOUNT_ID]: [TOKEN_ASSET_ID] },
        },
      }),
    );
  });

  it('creates the AssetsController slices when AssetsController is absent', () => {
    const state = createState({
      TokensController: tokensControllerWith({
        [FLARE_HEX]: { [ACCOUNT_ADDRESS]: [{ ...flareToken, name: '' }] },
      }),
      AccountsController: accountsController,
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        AccountsController: accountsController,
        AssetsController: {
          assetsInfo: {
            [TOKEN_ASSET_ID]: {
              type: 'erc20',
              symbol: 'WFLR',
              name: 'WFLR',
              decimals: 18,
              image: 'https://example.com/wflr.png',
              aggregators: ['coingecko'],
            },
          },
          customAssets: { [ACCOUNT_ID]: [TOKEN_ASSET_ID] },
        },
      }),
    );
  });

  it('never overwrites existing assetsInfo and does not duplicate custom assets', () => {
    const existingInfo = {
      type: 'erc20',
      symbol: 'EXISTING',
      name: 'Existing',
      decimals: 6,
    };
    const state = createState({
      TokensController: tokensControllerWith({
        [FLARE_HEX]: { [ACCOUNT_ADDRESS]: [flareToken] },
      }),
      AccountsController: accountsController,
      AssetsController: {
        ...emptyAssetsController,
        assetsInfo: { [TOKEN_ASSET_ID]: existingInfo },
        customAssets: { [ACCOUNT_ID]: [TOKEN_ASSET_ID] },
      },
    });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(result.engine.backgroundState).toStrictEqual({
      AccountsController: accountsController,
      AssetsController: {
        ...emptyAssetsController,
        assetsInfo: { [TOKEN_ASSET_ID]: existingInfo },
        customAssets: { [ACCOUNT_ID]: [TOKEN_ASSET_ID] },
      },
    });
  });

  it('does not add a custom asset that already has a balance entry', () => {
    const state = createState({
      TokensController: tokensControllerWith({
        [FLARE_HEX]: { [ACCOUNT_ADDRESS]: [flareToken] },
      }),
      AccountsController: accountsController,
      AssetsController: {
        ...emptyAssetsController,
        assetsBalance: { [ACCOUNT_ID]: { [TOKEN_ASSET_ID]: { amount: '1' } } },
      },
    });

    const result = migrate(state) as ReturnType<typeof createState>;
    const assetsController = result.engine.backgroundState
      .AssetsController as typeof emptyAssetsController;

    expect(Object.keys(assetsController.assetsInfo)).toStrictEqual([
      TOKEN_ASSET_ID,
    ]);
    expect(assetsController.customAssets).toStrictEqual({});
  });

  it('only heals assetsInfo when the token owner has no account', () => {
    const state = createState({
      TokensController: tokensControllerWith({
        [FLARE_HEX]: { '0x0000000000000000000000000000000000000001': [flareToken] },
      }),
      AccountsController: accountsController,
      AssetsController: emptyAssetsController,
    });

    const result = migrate(state) as ReturnType<typeof createState>;
    const assetsController = result.engine.backgroundState
      .AssetsController as typeof emptyAssetsController;

    expect(Object.keys(assetsController.assetsInfo)).toStrictEqual([
      TOKEN_ASSET_ID,
    ]);
    expect(assetsController.customAssets).toStrictEqual({});
  });

  it('skips Accounts-API chains, hidden, ignored, NFT and invalid tokens', () => {
    const state = createState({
      TokensController: tokensControllerWith(
        {
          [MAINNET_HEX]: { [ACCOUNT_ADDRESS]: [flareToken] },
          notAHexChainId: { [ACCOUNT_ADDRESS]: [flareToken] },
          [FLARE_HEX]: {
            [ACCOUNT_ADDRESS]: [
              flareToken,
              { ...flareToken, address: OTHER_TOKEN_ADDRESS },
              {
                ...flareToken,
                address: '0x2222222222222222222222222222222222222222',
                isERC721: true,
              },
              { ...flareToken, address: 'not-an-address' },
              {
                ...flareToken,
                address: '0x3333333333333333333333333333333333333333',
                symbol: '',
              },
              null,
            ],
          },
        },
        {
          [FLARE_HEX]: {
            [ACCOUNT_ADDRESS.toUpperCase().replace('0X', '0x')]: [
              OTHER_TOKEN_ADDRESS.toUpperCase().replace('0X', '0x'),
            ],
          },
        },
      ),
      AccountsController: accountsController,
      AssetsController: {
        ...emptyAssetsController,
        assetPreferences: { [TOKEN_ASSET_ID.toLowerCase()]: { hidden: true } },
      },
    });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(result.engine.backgroundState).toStrictEqual({
      AccountsController: accountsController,
      AssetsController: {
        ...emptyAssetsController,
        assetPreferences: { [TOKEN_ASSET_ID.toLowerCase()]: { hidden: true } },
      },
    });
  });

  it('returns state unchanged and reports the error when the migration throws', () => {
    const backgroundState = {
      AccountsController: accountsController,
      AssetsController: emptyAssetsController,
    };
    Object.defineProperty(backgroundState, 'TokensController', {
      enumerable: true,
      get: () => {
        throw new Error('boom');
      },
    });
    const state = createState(backgroundState);

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: Failed to remove TokensController state: boom`,
      ),
    );
  });
});
