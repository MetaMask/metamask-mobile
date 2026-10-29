import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './160';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const LOWERCASE_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const CHECKSUM_ADDRESS = '0xacA92E438df0B2401fF60dA7E4337B687a2435DA';
const LOWERCASE_MAINNET = `eip155:1/erc20:${LOWERCASE_ADDRESS}`;
const LOWERCASE_LINEA = `eip155:59144/erc20:${LOWERCASE_ADDRESS}`;
const LOWERCASE_MONAD = `eip155:143/erc20:${LOWERCASE_ADDRESS}`;
const CHECKSUM_MAINNET = `eip155:1/erc20:${CHECKSUM_ADDRESS}`;
const CHECKSUM_LINEA = `eip155:59144/erc20:${CHECKSUM_ADDRESS}`;
const CHECKSUM_MONAD = `eip155:143/erc20:${CHECKSUM_ADDRESS}`;
const OTHER_LOWERCASE =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const MUSD_METADATA = {
  type: 'erc20',
  symbol: 'mUSD',
  name: 'MetaMask USD',
  decimals: 6,
};
const STALE_MUSD_METADATA = { ...MUSD_METADATA, decimals: 18 };
const ENRICHED_MUSD_METADATA = {
  ...MUSD_METADATA,
  image: 'https://example.com/musd.png',
};
const OTHER_METADATA = {
  type: 'erc20',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
};

const createState = (
  assetsInfo: Record<string, unknown>,
  assetsBalance: Record<string, Record<string, unknown>> = {
    'account-1': { [CHECKSUM_MAINNET]: { amount: '4' } },
  },
) => ({
  engine: {
    backgroundState: {
      AssetsController: {
        assetsInfo,
        assetsBalance,
        selectedCurrency: 'usd',
      },
      OtherController: { preserved: true },
    },
  },
});

const getAssetsInfo = (state: unknown): Record<string, unknown> =>
  (state as ReturnType<typeof createState>).engine.backgroundState
    .AssetsController.assetsInfo;

describe(`Migration ${migrationVersion}: drop lowercase mUSD entries`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 160', () => {
    expect(migrationVersion).toBe(160);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
  });

  it('removes lowercase mUSD metadata and keeps checksummed entries', () => {
    const state = createState({
      [LOWERCASE_MAINNET]: STALE_MUSD_METADATA,
      [LOWERCASE_LINEA]: STALE_MUSD_METADATA,
      [LOWERCASE_MONAD]: STALE_MUSD_METADATA,
      [CHECKSUM_MAINNET]: ENRICHED_MUSD_METADATA,
      [CHECKSUM_LINEA]: MUSD_METADATA,
      [CHECKSUM_MONAD]: MUSD_METADATA,
      [OTHER_LOWERCASE]: OTHER_METADATA,
    });

    const result = migrate(state);

    expect(getAssetsInfo(result)).toStrictEqual({
      [CHECKSUM_MAINNET]: ENRICHED_MUSD_METADATA,
      [CHECKSUM_LINEA]: MUSD_METADATA,
      [CHECKSUM_MONAD]: MUSD_METADATA,
      [OTHER_LOWERCASE]: OTHER_METADATA,
    });
    expect(
      (result as ReturnType<typeof createState>).engine.backgroundState
        .AssetsController.assetsBalance,
    ).toStrictEqual({
      'account-1': { [CHECKSUM_MAINNET]: { amount: '4' } },
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('deletes a lowercase mUSD entry without writing checksummed metadata', () => {
    const state = createState({
      [LOWERCASE_MAINNET]: STALE_MUSD_METADATA,
    });

    const result = migrate(state);

    expect(getAssetsInfo(result)).toStrictEqual({});
  });

  it('removes lowercase mUSD balances and keeps checksummed balances', () => {
    const state = createState(
      { [CHECKSUM_MAINNET]: MUSD_METADATA },
      {
        'account-1': {
          [LOWERCASE_MAINNET]: { amount: '1' },
          [LOWERCASE_LINEA]: { amount: '2' },
          [CHECKSUM_MAINNET]: { amount: '4' },
          [OTHER_LOWERCASE]: { amount: '8' },
        },
        'account-2': {
          [LOWERCASE_MONAD]: { amount: '3' },
        },
      },
    );

    const result = migrate(state);

    expect(
      (result as ReturnType<typeof createState>).engine.backgroundState
        .AssetsController.assetsBalance,
    ).toStrictEqual({
      'account-1': {
        [CHECKSUM_MAINNET]: { amount: '4' },
        [OTHER_LOWERCASE]: { amount: '8' },
      },
      'account-2': {},
    });
  });

  it('leaves state unchanged when no lowercase mUSD keys exist', () => {
    const state = createState({
      [CHECKSUM_MAINNET]: MUSD_METADATA,
      [OTHER_LOWERCASE]: OTHER_METADATA,
    });
    const before = JSON.parse(JSON.stringify(state));

    const result = migrate(state);

    expect(result).toStrictEqual(before);
  });

  it('does nothing when AssetsController state is absent', () => {
    const state = { engine: { backgroundState: {} } };

    const result = migrate(state);

    expect(result).toStrictEqual({ engine: { backgroundState: {} } });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('tolerates malformed assetsInfo', () => {
    const state = {
      engine: {
        backgroundState: {
          AssetsController: { assetsInfo: 'invalid' },
        },
      },
    };

    expect(() => migrate(state)).not.toThrow();
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('reports errors to Sentry and returns state', () => {
    const state = createState({});
    Object.defineProperty(
      state.engine.backgroundState.AssetsController,
      'assetsInfo',
      {
        get() {
          throw new Error('boom');
        },
      },
    );

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('boom'),
      }),
    );
  });
});
