import { useRampsBuyLimits } from './useRampsBuyLimits';
import type {
  Provider as RampProvider,
  UserRegion,
} from '@metamask/ramps-controller';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { getProviderBuyLimit } from '../utils/providerLimits';
import { getProviderLimitMessage } from '../utils/getProviderLimitMessage';
import { useFormatters } from '../../../hooks/useFormatters';

jest.mock('../utils/providerLimits');
jest.mock('../utils/getProviderLimitMessage');
jest.mock('../../../hooks/useFormatters');

const mockProvider = {
  id: '/providers/transak-native',
  name: 'Transak Native',
  type: 'native',
} as unknown as RampProvider;

const PAYMENT_METHOD_ID = '/payments/debit-credit-card';

function makeState({
  selectedProvider = mockProvider,
  userRegion = {
    country: { currency: 'USD' } as UserRegion['country'],
    state: null,
    regionCode: 'us',
  },
}: {
  selectedProvider?: RampProvider | null;
  userRegion?: UserRegion | null;
} = {}) {
  return {
    engine: {
      backgroundState: {
        RampsController: {
          userRegion,
          providers: {
            data: selectedProvider ? [selectedProvider] : [],
            selected: selectedProvider,
            isLoading: false,
            error: null,
          },
        },
      },
    },
  };
}

function runHook(
  options: Parameters<typeof useRampsBuyLimits>[0],
  state = makeState(),
) {
  return renderHookWithProvider(() => useRampsBuyLimits(options), { state });
}

describe('useRampsBuyLimits', () => {
  const getProviderBuyLimitMock = jest.mocked(getProviderBuyLimit);
  const getProviderLimitMessageMock = jest.mocked(getProviderLimitMessage);
  const useFormattersMock = jest.mocked(useFormatters);
  const mockFormatCurrency = jest.fn((value: number) => `$${value.toFixed(2)}`);

  beforeEach(() => {
    jest.resetAllMocks();

    useFormattersMock.mockReturnValue({
      formatCurrency: mockFormatCurrency,
    } as unknown as ReturnType<typeof useFormatters>);
    getProviderBuyLimitMock.mockReturnValue({
      minAmount: 10,
      maxAmount: 1000,
      feeFixedRate: 0,
      feeDynamicRate: 0,
    });
    getProviderLimitMessageMock.mockReturnValue(null);
  });

  it('exposes minAmount and maxAmount from the selected provider limits', () => {
    const { result } = runHook({
      amount: 50,
      paymentMethodId: PAYMENT_METHOD_ID,
    });

    expect(result.current.minAmount).toBe(10);
    expect(result.current.maxAmount).toBe(1000);
    expect(getProviderBuyLimitMock).toHaveBeenCalledWith(
      mockProvider,
      'USD',
      PAYMENT_METHOD_ID,
    );
  });

  it('exposes the limit message for the selected provider and amount', () => {
    getProviderLimitMessageMock.mockReturnValue('Minimum purchase is $10.00');

    const { result } = runHook({
      amount: 5,
      paymentMethodId: PAYMENT_METHOD_ID,
    });

    expect(result.current.amountLimitError).toBe('Minimum purchase is $10.00');
    expect(getProviderLimitMessageMock).toHaveBeenCalledWith({
      provider: mockProvider,
      fiatCurrency: 'USD',
      paymentMethodId: PAYMENT_METHOD_ID,
      amount: 5,
      currency: 'USD',
      formatCurrency: mockFormatCurrency,
    });
  });

  it('returns undefined limits and null error when no provider is selected', () => {
    getProviderBuyLimitMock.mockReturnValue(undefined);

    const { result } = runHook(
      { amount: 50, paymentMethodId: PAYMENT_METHOD_ID },
      makeState({ selectedProvider: null }),
    );

    expect(result.current.minAmount).toBeUndefined();
    expect(result.current.maxAmount).toBeUndefined();
    expect(result.current.amountLimitError).toBeNull();
    expect(getProviderBuyLimitMock).toHaveBeenCalledWith(
      null,
      'USD',
      PAYMENT_METHOD_ID,
    );
  });

  it('uses userRegion.country.currency as the currency', () => {
    const state = makeState({
      userRegion: {
        country: { currency: 'EUR' } as UserRegion['country'],
        state: null,
        regionCode: 'de',
      },
    });

    const { result } = runHook(
      { amount: 50, paymentMethodId: PAYMENT_METHOD_ID },
      state,
    );

    expect(result.current.currency).toBe('EUR');
    expect(getProviderBuyLimitMock).toHaveBeenCalledWith(
      mockProvider,
      'EUR',
      PAYMENT_METHOD_ID,
    );
  });

  it('defaults currency to USD when userRegion is null', () => {
    const state = makeState({ userRegion: null });

    const { result } = runHook(
      { amount: 50, paymentMethodId: PAYMENT_METHOD_ID },
      state,
    );

    expect(result.current.currency).toBe('USD');
  });

  it('uses the currency override instead of the userRegion currency', () => {
    const state = makeState({
      userRegion: {
        country: { currency: 'EUR' } as UserRegion['country'],
        state: null,
        regionCode: 'de',
      },
    });

    const { result } = runHook(
      { amount: 50, paymentMethodId: PAYMENT_METHOD_ID, currency: 'USD' },
      state,
    );

    expect(result.current.currency).toBe('USD');
    expect(getProviderBuyLimitMock).toHaveBeenCalledWith(
      mockProvider,
      'USD',
      PAYMENT_METHOD_ID,
    );
  });
});
