import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './165';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const ARC_ERC20_USDC_ASSET_ID =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';
const ACCOUNT_1 = 'account-1';
const ACCOUNT_2 = 'account-2';
const OTHER_ASSET_ID =
  'eip155:1/erc20:0x0000000000000000000000000000000000000abc';

const createState = (customAssets: Record<string, unknown> | undefined) => ({
  engine: {
    backgroundState: {
      AssetsController: {
        ...(customAssets ? { customAssets } : {}),
        assetsInfo: { preserved: true },
      },
      OtherController: { preserved: true },
    },
  },
});

describe(`Migration ${migrationVersion}: remove Arc ERC-20 USDC custom asset`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 165', () => {
    expect(migrationVersion).toBe(165);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
    expect(mockedEnsureValidState).toHaveBeenCalledWith(state, 165);
  });

  it('returns state unchanged when AssetsController is missing', () => {
    const state = {
      engine: { backgroundState: { OtherController: { preserved: true } } },
    };

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when customAssets is not an object', () => {
    const state = {
      engine: {
        backgroundState: {
          AssetsController: {
            customAssets: 'not-a-map',
            assetsInfo: { preserved: true },
          },
        },
      },
    };

    expect(migrate(state)).toBe(state);
  });

  it('returns state unchanged when the Arc ERC-20 USDC custom asset is absent', () => {
    const state = createState({ [ACCOUNT_1]: [OTHER_ASSET_ID] });

    expect(migrate(state)).toBe(state);
  });

  it('removes the Arc ERC-20 USDC custom asset and keeps the rest', () => {
    const state = createState({
      [ACCOUNT_1]: [ARC_ERC20_USDC_ASSET_ID, OTHER_ASSET_ID],
    });

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.AssetsController.customAssets,
    ).toStrictEqual({
      [ACCOUNT_1]: [OTHER_ASSET_ID],
    });
    expect(
      result.engine.backgroundState.AssetsController.assetsInfo,
    ).toStrictEqual({
      preserved: true,
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
  });

  it('removes accounts left with no custom assets', () => {
    const state = createState({
      [ACCOUNT_1]: [ARC_ERC20_USDC_ASSET_ID],
      [ACCOUNT_2]: [OTHER_ASSET_ID],
    });

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.AssetsController.customAssets,
    ).toStrictEqual({
      [ACCOUNT_2]: [OTHER_ASSET_ID],
    });
  });

  it('keeps accounts whose custom assets are not an array', () => {
    const state = createState({
      [ACCOUNT_1]: 'not-an-array',
      [ACCOUNT_2]: [ARC_ERC20_USDC_ASSET_ID],
    });

    const result = migrate(state) as typeof state;

    expect(
      result.engine.backgroundState.AssetsController.customAssets,
    ).toStrictEqual({
      [ACCOUNT_1]: 'not-an-array',
    });
  });

  it('does not mutate the input state', () => {
    const state = createState({
      [ACCOUNT_1]: [ARC_ERC20_USDC_ASSET_ID, OTHER_ASSET_ID],
    });
    const before = JSON.parse(JSON.stringify(state));

    migrate(state);

    expect(state).toStrictEqual(before);
  });

  it('reports the error and returns state unchanged when the state is malformed', () => {
    const state = createState({ [ACCOUNT_1]: [ARC_ERC20_USDC_ASSET_ID] });
    Object.defineProperty(
      state.engine.backgroundState.AssetsController,
      'customAssets',
      {
        get: () => {
          throw new Error('boom');
        },
      },
    );

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledTimes(1);
  });
});
