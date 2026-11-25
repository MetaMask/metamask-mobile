import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from './useDefaultPayWithTokenWhenNoPerpsBalance';
import type { PerpsToken } from '@metamask/perps-controller';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.70.0'),
}));

jest.mock('./usePerpsPaymentTokens', () => ({
  usePerpsPaymentTokens: jest.fn(() => []),
}));

jest.mock('./stream/usePerpsLiveAvailableToTrade', () => ({
  ...jest.requireActual('./stream/usePerpsLiveAvailableToTrade'),
  usePerpsLiveAvailableToTrade: jest.fn(() => ({
    availableToTrade: null,
    isInitialLoading: false,
  })),
}));

const mockUsePerpsPaymentTokens = jest.requireMock<
  typeof import('./usePerpsPaymentTokens')
>('./usePerpsPaymentTokens').usePerpsPaymentTokens as jest.MockedFunction<
  (typeof import('./usePerpsPaymentTokens'))['usePerpsPaymentTokens']
>;

const mockUsePerpsLiveAvailableToTrade = jest.mocked(
  jest.requireMock<typeof import('./stream/usePerpsLiveAvailableToTrade')>(
    './stream/usePerpsLiveAvailableToTrade',
  ).usePerpsLiveAvailableToTrade,
);

const ALLOWLIST_USDC_TOKEN = {
  address: '0xusdc',
  chainId: '0xa4b1',
  symbol: 'USDC',
  balanceFiat: 'US$500',
  decimals: 6,
} as PerpsToken;

function getState(
  overrides: {
    perpsAccount?: { spendableBalance: string } | null;
    allowlistAssets?: string[];
    isTestnet?: boolean;
    activeProvider?: 'hyperliquid' | 'lighter' | 'aggregated';
    defaultPayTokenWhenNoBalanceEnabled?: boolean;
  } = {},
) {
  const {
    perpsAccount = { spendableBalance: '0' },
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
    mockUsePerpsLiveAvailableToTrade.mockReturnValue({
      availableToTrade: null,
      isInitialLoading: false,
    });
  });

  describe('with a market symbol', () => {
    const runHookForSymbol = (state: ReturnType<typeof getState>) =>
      renderHookWithProvider(
        () => useDefaultPayWithTokenWhenNoPerpsBalance('BTC'),
        { state },
      );

    it('keeps Perps balance when available to trade covers the order but withdrawable does not', () => {
      mockUsePerpsPaymentTokens.mockReturnValue([ALLOWLIST_USDC_TOKEN]);
      mockUsePerpsLiveAvailableToTrade.mockReturnValue({
        availableToTrade: {
          providerId: 'hyperliquid',
          symbol: 'BTC',
          long: '250',
          short: '0',
        },
        isInitialLoading: false,
      });

      const { result } = runHookForSymbol(
        getState({
          perpsAccount: { spendableBalance: '0' },
          allowlistAssets: ['0xa4b1.0xusdc'],
        }),
      );

      expect(result.current).toBeNull();
      expect(mockUsePerpsLiveAvailableToTrade).toHaveBeenCalledWith({
        symbol: 'BTC',
        enabled: true,
      });
    });

    it('returns the allowlist token when available to trade is below threshold on both sides', () => {
      mockUsePerpsPaymentTokens.mockReturnValue([ALLOWLIST_USDC_TOKEN]);
      mockUsePerpsLiveAvailableToTrade.mockReturnValue({
        availableToTrade: {
          providerId: 'hyperliquid',
          symbol: 'BTC',
          long: '0',
          short: '0',
        },
        isInitialLoading: false,
      });

      const { result } = runHookForSymbol(
        getState({
          perpsAccount: { spendableBalance: '500' },
          allowlistAssets: ['0xa4b1.0xusdc'],
        }),
      );

      expect(result.current?.address).toBe('0xusdc');
    });

    it('returns null while available to trade is loading', () => {
      mockUsePerpsPaymentTokens.mockReturnValue([ALLOWLIST_USDC_TOKEN]);
      mockUsePerpsLiveAvailableToTrade.mockReturnValue({
        availableToTrade: null,
        isInitialLoading: true,
      });

      const { result } = runHookForSymbol(
        getState({
          perpsAccount: { spendableBalance: '0' },
          allowlistAssets: ['0xa4b1.0xusdc'],
        }),
      );

      expect(result.current).toBeNull();
    });

    it('falls back to spendable balance when the stream reports no value', () => {
      mockUsePerpsPaymentTokens.mockReturnValue([ALLOWLIST_USDC_TOKEN]);

      const { result } = runHookForSymbol(
        getState({
          perpsAccount: { spendableBalance: '0' },
          allowlistAssets: ['0xa4b1.0xusdc'],
        }),
      );

      expect(result.current?.address).toBe('0xusdc');
    });
  });

  it('returns null when available perps balance is above threshold', () => {
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
        perpsAccount: { spendableBalance: '100' },
        allowlistAssets: ['0xa4b1.0xusdc'],
      }),
    );

    expect(result.current).toBeNull();
  });

  it('does not offer pay-with-token funding for Lighter without a deposit route', () => {
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
        activeProvider: 'lighter',
        allowlistAssets: ['0xa4b1.0xusdc'],
      }),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when feature flag is disabled', () => {
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

    expect(result.current).toBeNull();
  });

  it('returns null when allowlist is empty', () => {
    const { result } = runHook(getState({ allowlistAssets: [] }));

    expect(result.current).toBeNull();
  });

  it('returns null when no payment tokens match allowlist', () => {
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

    expect(result.current).toBeNull();
  });

  it('returns null when top allowlist token balance is below threshold', () => {
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

    expect(result.current).toBeNull();
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

    expect(result.current).not.toBeNull();
    expect(result.current?.address).toBe('0xusdc');
    expect(result.current?.chainId).toBe('0xa4b1');
    expect(result.current?.description).toBe('USDC');
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

    expect(result.current).not.toBeNull();
    expect(result.current?.description).toBe('USDC');
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

    expect(result.current).toBeNull();
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

    expect(result.current).toBeNull();
  });
});
