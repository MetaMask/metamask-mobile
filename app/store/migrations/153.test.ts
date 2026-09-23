import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './153';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

const ARC_ERC20_USDC =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';
const ARC_ERC20_USDC_UPPER = ARC_ERC20_USDC.toUpperCase();
const ARC_NATIVE = 'eip155:5042/slip44:5042';
const DAI = 'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';
const ACCOUNT_1 = 'account-1';
const ACCOUNT_2 = 'account-2';

interface TestState {
  engine: {
    backgroundState: Record<string, unknown>;
    preserved?: boolean;
  };
  preserved?: boolean;
}

function buildValidState(
  assetsController?: Record<string, unknown>,
): TestState {
  return {
    engine: {
      backgroundState: {
        ...(assetsController !== undefined
          ? { AssetsController: assetsController }
          : {}),
        OtherController: { preserved: true },
      },
      preserved: true,
    },
    preserved: true,
  };
}

describe(`Migration ${migrationVersion}: Strip Arc ERC-20 USDC from AssetsController`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(153);
  });

  it('does nothing when AssetsController is missing', () => {
    const state = buildValidState();
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing when the Arc ERC-20 pin is not present', () => {
    const state = buildValidState({
      customAssets: { [ACCOUNT_1]: [DAI] },
      assetsBalance: { [ACCOUNT_1]: { [DAI]: { amount: '1' } } },
      assetsInfo: { [DAI]: { symbol: 'DAI' } },
      assetPreferences: {},
    });
    const snapshot = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshot);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes the Arc ERC-20 pin from customAssets, balances, metadata, and preferences', () => {
    const state = buildValidState({
      customAssets: {
        [ACCOUNT_1]: [DAI, ARC_ERC20_USDC],
        [ACCOUNT_2]: [ARC_ERC20_USDC],
      },
      assetsBalance: {
        [ACCOUNT_1]: {
          [DAI]: { amount: '1' },
          [ARC_ERC20_USDC]: { amount: '0' },
          [ARC_NATIVE]: { amount: '10' },
        },
      },
      assetsInfo: {
        [DAI]: { symbol: 'DAI' },
        [ARC_ERC20_USDC]: { symbol: 'USDC' },
        [ARC_NATIVE]: { symbol: 'USDC' },
      },
      assetPreferences: {
        [ARC_ERC20_USDC]: { hidden: false },
      },
    });

    const result = migrate(state) as TestState;

    expect(result.engine.backgroundState.AssetsController).toStrictEqual({
      customAssets: {
        [ACCOUNT_1]: [DAI],
      },
      assetsBalance: {
        [ACCOUNT_1]: {
          [DAI]: { amount: '1' },
          [ARC_NATIVE]: { amount: '10' },
        },
      },
      assetsInfo: {
        [DAI]: { symbol: 'DAI' },
        [ARC_NATIVE]: { symbol: 'USDC' },
      },
      assetPreferences: {},
    });
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
    expect(result.engine.preserved).toBe(true);
    expect(result.preserved).toBe(true);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('matches the Arc ERC-20 asset id case-insensitively', () => {
    const state = buildValidState({
      customAssets: { [ACCOUNT_1]: [ARC_ERC20_USDC_UPPER] },
      assetsBalance: {
        [ACCOUNT_1]: { [ARC_ERC20_USDC_UPPER]: { amount: '0' } },
      },
      assetsInfo: { [ARC_ERC20_USDC_UPPER]: { symbol: 'USDC' } },
      assetPreferences: { [ARC_ERC20_USDC_UPPER]: { hidden: true } },
    });

    const result = migrate(state) as TestState;

    expect(result.engine.backgroundState.AssetsController).toStrictEqual({
      customAssets: {},
      assetsBalance: { [ACCOUNT_1]: {} },
      assetsInfo: {},
      assetPreferences: {},
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { invalid: true };

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
