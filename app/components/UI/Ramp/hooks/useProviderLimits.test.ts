import { renderHook } from '@testing-library/react-native';
import { useProviderLimits } from './useProviderLimits';
import {
  getProviderBuyLimit,
  type ProviderBuyLimit,
} from '../utils/providerLimits';
import type { Provider } from '@metamask/ramps-controller';
import { useFormatters } from '../../../hooks/useFormatters';

jest.mock('../utils/providerLimits', () => ({
  getProviderBuyLimit: jest.fn(),
}));

jest.mock('../../../hooks/useFormatters', () => ({
  useFormatters: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    if (key === 'fiat_on_ramp.min_purchase_limit') {
      return `Minimum purchase is ${params?.amount}`;
    }
    if (key === 'fiat_on_ramp.max_purchase_limit') {
      return `Maximum purchase is ${params?.amount}`;
    }
    return key;
  },
}));

const mockGetProviderBuyLimit = jest.mocked(getProviderBuyLimit);
const mockUseFormatters = jest.mocked(useFormatters);

const mockProvider = { id: 'test-provider', name: 'Test' } as Provider;

const mockLimit: ProviderBuyLimit = {
  minAmount: 10,
  maxAmount: 1000,
};

describe('useProviderLimits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormatters.mockReturnValue({
      formatCurrency: (value: number) => `$${value.toFixed(2)}`,
    } as unknown as ReturnType<typeof useFormatters>);
    mockGetProviderBuyLimit.mockReturnValue(mockLimit);
  });

  it('returns null when amount is 0', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 0,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns null when amount is negative', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: -5,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns null when provider has no limits', () => {
    mockGetProviderBuyLimit.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 50,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns null when provider is null', () => {
    mockGetProviderBuyLimit.mockReturnValue(undefined);
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: null,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 50,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns min error when amount is below minAmount', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 5,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBe('Minimum purchase is $10.00');
  });

  it('returns max error when amount exceeds maxAmount', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 2000,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBe(
      'Maximum purchase is $1000.00',
    );
  });

  it('returns null at exact minAmount boundary', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 10,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns null at exact maxAmount boundary', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 1000,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('returns null when amount is within range', () => {
    const { result } = renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 500,
        currency: 'USD',
      }),
    );
    expect(result.current.amountLimitError).toBeNull();
  });

  it('passes correct arguments to getProviderBuyLimit', () => {
    renderHook(() =>
      useProviderLimits({
        provider: mockProvider,
        fiatCurrency: 'usd',
        paymentMethodId: 'card',
        amount: 50,
        currency: 'USD',
      }),
    );
    expect(mockGetProviderBuyLimit).toHaveBeenCalledWith(
      mockProvider,
      'usd',
      'card',
    );
  });
});
