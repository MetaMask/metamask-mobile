import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from './useDefaultPayWithTokenWhenNoPerpsBalance';
import type { PerpsToken } from '@metamask/perps-controller';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.70.0'),
}));

jest.mock('./usePerpsPaymentTokens', () => ({
  usePerpsPaymentTokens: jest.fn(() => []),
}));

const mockUsePerpsPaymentTokens = jest.requireMock<
  typeof import('./usePerpsPaymentTokens')
>('./usePerpsPaymentTokens').usePerpsPaymentTokens as jest.MockedFunction<
  (typeof import('./usePerpsPaymentTokens'))['usePerpsPaymentTokens']
>;

function getState(
  overrides: {
    perpsAccount?: { availableBalance: string } | null;
    allowlistAssets?: string[];
    isTestnet?: boolean;
    activeProvider?: 'hyperliquid' | 'myx' | 'aggregated';
    defaultPayTokenWhenNoBalanceEnabled?: boolean;
  } = {},
) {
  const {
    perpsAccount = { availableBalance: '0' },
    allowlistAssets = [],
    isTestnet = false,
    activeProvider,
    defaultPayTokenWhenNoBalanceEnabled = true,
  } = overrides;
  return {
    engine: {
      backgroundState: {
        PerpsController: {
          accountState: perpsAccount,
          isTestnet,
          ...(activeProvider !== undefined && { activeProvider }),
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            perpsPayWithAnyTokenAllowlistAssets: allowlistAssets,
            perpsDefaultPayTokenWhenNoBalanceEnabled:
              defaultPayTokenWhenNoBalanceEnabled
                ? { enabled: true, minimumVersion: '0.0.0' }
                : { enabled: false, minimumVersion: '0.0.0' },
          },
        },
      },
    },
  };
}

function runHook(state: ReturnType<typeof getState>) {
  return renderHookWithProvider(
    () => useDefaultPayWithTokenWhenNoPerpsBalance(),
    {
      state,
    },
  );
}

describe('useDefaultPayWithTokenWhenNoPerpsBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsPaymentTokens.mockReturnValue([]);
  });

  it('returns null token when available perps balance is above threshold', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: '$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        perpsAccount: { availableBalance: '100' },
        allowlistAssets: ['0xa4b1.0xusdc'],
      }),
    );

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('returns null token when feature flag is disabled', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        allowlistAssets: ['0xa4b1.0xusdc'],
        defaultPayTokenWhenNoBalanceEnabled: false,
      }),
    );

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('returns null token when allowlist is empty', () => {
    const { result } = runHook(getState({ allowlistAssets: [] }));

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('returns null token when no payment tokens match allowlist', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: '$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(getState({ allowlistAssets: ['0x1.0xother'] }));

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('returns null token when top allowlist token balance is below threshold', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$0.005',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({ allowlistAssets: ['0xa4b1.0xusdc'] }),
    );

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('returns top allowlist token by fiat balance when perps balance is below threshold', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xweth',
        chainId: '0x1',
        symbol: 'WETH',
        balanceFiat: 'US$100',
        decimals: 18,
      },
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        allowlistAssets: ['0xa4b1.0xusdc', '0x1.0xweth'],
      }),
    );

    expect(result.current.token).not.toBeNull();
    expect(result.current.token?.address).toBe('0xusdc');
    expect(result.current.token?.chainId).toBe('0xa4b1');
    expect(result.current.token?.description).toBe('USDC');
    expect(result.current.balanceUsd).toBe(500);
  });

  it('treats null perps account as zero balance and returns default token when allowlist has balance', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        perpsAccount: null,
        allowlistAssets: ['0xa4b1.0xusdc'],
      }),
    );

    expect(result.current.token).not.toBeNull();
    expect(result.current.token?.description).toBe('USDC');
    expect(result.current.balanceUsd).toBe(500);
  });

  it('excludes current perps provider chain tokens from allowlist result', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xhlusdc',
        chainId: '0x3e7',
        symbol: 'USDC',
        balanceFiat: 'US$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        allowlistAssets: ['0x3e7.0xhlusdc'],
        activeProvider: 'hyperliquid',
      }),
    );

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('excludes default provider chain when activeProvider is aggregated', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xhlusdc',
        chainId: '0x3e7',
        symbol: 'USDC',
        balanceFiat: 'US$500',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({
        allowlistAssets: ['0x3e7.0xhlusdc'],
        activeProvider: 'aggregated',
      }),
    );

    expect(result.current.token).toBeNull();
    expect(result.current.balanceUsd).toBeUndefined();
  });

  it('parses balanceFiat with $ prefix correctly', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: '$250.75',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({ allowlistAssets: ['0xa4b1.0xusdc'] }),
    );

    expect(result.current.token).not.toBeNull();
    expect(result.current.token?.address).toBe('0xusdc');
    expect(result.current.balanceUsd).toBe(250.75);
  });

  it('selects highest balance token regardless of currency format', () => {
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xeth',
        chainId: '0x1',
        symbol: 'ETH',
        balanceFiat: '$50',
        decimals: 18,
      },
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$200',
        decimals: 6,
      },
    ] as PerpsToken[]);

    const { result } = runHook(
      getState({ allowlistAssets: ['0x1.0xeth', '0xa4b1.0xusdc'] }),
    );

    expect(result.current.token?.address).toBe('0xusdc');
    expect(result.current.token?.description).toBe('USDC');
    expect(result.current.balanceUsd).toBe(200);
  });
});
