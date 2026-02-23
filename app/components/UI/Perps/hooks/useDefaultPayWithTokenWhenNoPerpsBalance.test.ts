import { renderHook } from '@testing-library/react-native';
import { useDefaultPayWithTokenWhenNoPerpsBalance } from './useDefaultPayWithTokenWhenNoPerpsBalance';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./index', () => ({
  usePerpsNetwork: jest.fn(() => 'mainnet'),
}));

jest.mock('./usePerpsPaymentTokens', () => ({
  usePerpsPaymentTokens: jest.fn(() => []),
}));

const mockUseSelector = jest.requireMock<typeof import('react-redux')>(
  'react-redux',
).useSelector as jest.MockedFunction<
  (typeof import('react-redux'))['useSelector']
>;
const mockUsePerpsNetwork = jest.requireMock<typeof import('./index')>(
  './index',
).usePerpsNetwork as jest.MockedFunction<
  (typeof import('./index'))['usePerpsNetwork']
>;
const mockUsePerpsPaymentTokens = jest.requireMock<
  typeof import('./usePerpsPaymentTokens')
>('./usePerpsPaymentTokens').usePerpsPaymentTokens as jest.MockedFunction<
  (typeof import('./usePerpsPaymentTokens'))['usePerpsPaymentTokens']
>;

describe('useDefaultPayWithTokenWhenNoPerpsBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return [];
      }
      return undefined;
    });
    mockUsePerpsNetwork.mockReturnValue('mainnet');
    mockUsePerpsPaymentTokens.mockReturnValue([]);
  });

  it('returns null when available perps balance is above threshold', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '100' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0xa4b1.0xusdc'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: '$500',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when allowlist is empty', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return [];
      }
      return undefined;
    });

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when no payment tokens match allowlist', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0x1.0xother'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: '$500',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).toBeNull();
  });

  it('returns null when top allowlist token balance is below threshold', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0xa4b1.0xusdc'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$0.005',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).toBeNull();
  });

  it('returns top allowlist token by fiat balance when perps balance is below threshold', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0xa4b1.0xusdc', '0x1.0xweth'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xweth',
        chainId: '0x1',
        symbol: 'WETH',
        balanceFiat: 'US$100',
      },
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$500',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.address).toBe('0xusdc');
    expect(result.current?.chainId).toBe('0xa4b1');
    expect(result.current?.description).toBe('USDC');
  });

  it('treats null perps account as zero balance and returns default token when allowlist has balance', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return null;
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0xa4b1.0xusdc'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xusdc',
        chainId: '0xa4b1',
        symbol: 'USDC',
        balanceFiat: 'US$500',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).not.toBeNull();
    expect(result.current?.description).toBe('USDC');
  });

  it('excludes Hyperliquid chain tokens from allowlist result', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectPerpsAccountState) {
        return { availableBalance: '0' };
      }
      if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
        return ['0x3e7.0xhlusdc'];
      }
      return undefined;
    });
    mockUsePerpsPaymentTokens.mockReturnValue([
      {
        address: '0xhlusdc',
        chainId: '0x3e7',
        symbol: 'USDC',
        balanceFiat: 'US$500',
      },
    ] as ReturnType<typeof mockUsePerpsPaymentTokens>[number][]);

    const { result } = renderHook(() =>
      useDefaultPayWithTokenWhenNoPerpsBalance(),
    );

    expect(result.current).toBeNull();
  });
});
