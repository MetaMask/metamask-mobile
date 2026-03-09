import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from './useDefaultPayWithTokenWhenNoPerpsBalance';
import type { PerpsToken } from '@metamask/perps-controller';

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
  } = {},
) {
  const {
    perpsAccount = { availableBalance: '0' },
    allowlistAssets = [],
    isTestnet = false,
    activeProvider,
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
        perpsAccount: { availableBalance: '100' },
        allowlistAssets: ['0xa4b1.0xusdc'],
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
