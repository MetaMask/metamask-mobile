import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCreditBalance from './useCreditBalance';
import Engine from '../../../../core/Engine';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { selectCardFiatCreditFeatureEnabled } from '../../../../selectors/featureFlagController/card';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCreditWallet: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./useCardCapabilities', () => ({
  useCardCapabilities: () => ({ supportsCredit: true }),
}));

jest.mock('../../../../selectors/cardController', () => ({
  selectIsCardAuthenticated: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardFiatCreditFeatureEnabled: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../Money/utils/moneyActivityFiat', () => ({
  getUsdToFiatConversionRate: () => 1,
}));

const mockUseSelector = jest.requireMock('react-redux')
  .useSelector as jest.Mock;
const mockGetCreditWallet = Engine.context.CardController
  .getCreditWallet as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useCreditBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsCardAuthenticated) return true;
      if (selector === selectCardFiatCreditFeatureEnabled) return true;
      if (selector === selectCurrencyRates) return {};
      return undefined;
    });
  });

  it('returns credit balance and hasCredit when wallet has balance', async () => {
    mockGetCreditWallet.mockResolvedValue({
      id: 'c1',
      balance: '12.5',
      currency: 'usdc',
      isWithdrawable: true,
      type: 'credit',
    });

    const { result } = renderHook(() => useCreditBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.hasCredit).toBe(true);
    });

    expect(result.current.creditBalanceNumber).toBe(12.5);
    expect(result.current.creditFiatNumber).toBe(12.5);
    expect(result.current.error).toBeNull();
  });

  it('exposes error when credit wallet fetch fails without inventing hasCredit', async () => {
    const { CardProviderError, CardProviderErrorCode } = jest.requireActual(
      '../../../../core/Engine/controllers/card-controller/provider-types',
    );
    mockGetCreditWallet.mockRejectedValue(
      new CardProviderError(CardProviderErrorCode.ServerError, 'server', 500),
    );

    const { result } = renderHook(() => useCreditBalance(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect(result.current.hasCredit).toBe(false);
    expect(result.current.creditBalanceNumber).toBe(0);
  });
});
