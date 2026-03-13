import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HeadlessBuy from './HeadlessBuy';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';
import { RampsOrderStatus } from '@metamask/ramps-controller';

const MOCK_PARAMS = {
  assetId: 'eip155:1/slip44:60',
  paymentMethodId: '/payments/debit-credit-card',
  amount: 100,
};

const mockNavigate = jest.fn();
const mockPop = jest.fn();

const mockSetSelectedToken = jest.fn();
const mockSetSelectedPaymentMethod = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dangerouslyGetParent: () => ({ pop: mockPop }),
  }),
}));

const mockUseParams = jest.fn(() => MOCK_PARAMS);
jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: { addListener: jest.fn() },
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

const mockPaymentMethods = [
  { id: '/payments/debit-credit-card', name: 'Card' },
  { id: '/payments/bank-transfer', name: 'Bank Transfer' },
];

const mockSelectedProvider = {
  id: '/providers/mercuryo',
  name: 'Mercuryo',
};

const mockSelectedToken = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
};

let mockQuotesData: {
  success: { provider: string; quote?: { paymentMethod: string } }[];
  sorted: unknown[];
  error: unknown[];
  customActions: unknown[];
} | null = null;
let mockQuotesLoading = false;
let mockQuotesError: string | null = null;

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedProvider: mockSelectedProvider,
    selectedToken: mockSelectedToken,
    setSelectedToken: mockSetSelectedToken,
    setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
    getWidgetUrl: jest.fn().mockResolvedValue('https://example.com/widget'),
    userRegion: { country: { currency: 'USD' } },
    paymentMethods: mockPaymentMethods,
    paymentMethodsLoading: false,
  }),
}));

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: () => ({
    data: mockQuotesData,
    loading: mockQuotesLoading,
    error: mockQuotesError,
  }),
}));

const mockTransakCheckExistingToken = jest.fn();
const mockTransakGetBuyQuote = jest.fn();
jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    checkExistingToken: mockTransakCheckExistingToken,
    getBuyQuote: mockTransakGetBuyQuote,
  }),
}));

const mockTransakRouteAfterAuth = jest.fn();
jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockTransakRouteAfterAuth,
  }),
}));

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x1234567890abcdef',
}));

jest.mock('../../utils/getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: () => 'https://callback.example.com',
}));

jest.mock('../Checkout', () => ({
  createCheckoutNavDetails: (params: unknown) => ['Checkout', params],
}));

jest.mock('../NativeFlow/EnterEmail', () => ({
  createV2EnterEmailNavDetails: (params: unknown) => ['RampEnterEmail', params],
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockSubscribe = Engine.controllerMessenger
  .subscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribe
>;
const mockUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.unsubscribe
>;

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('HeadlessBuy', () => {
  let orderStatusHandler: (event: {
    order: { status: RampsOrderStatus };
    previousStatus: RampsOrderStatus;
  }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(MOCK_PARAMS);
    mockQuotesData = null;
    mockQuotesLoading = false;
    mockQuotesError = null;
    mockTransakCheckExistingToken.mockResolvedValue(false);
    mockTransakGetBuyQuote.mockResolvedValue(null);
    mockTransakRouteAfterAuth.mockResolvedValue(undefined);

    mockSubscribe.mockImplementation(
      (
        _event: string,
        handler: (event: {
          order: { status: RampsOrderStatus };
          previousStatus: RampsOrderStatus;
        }) => void,
      ) => {
        orderStatusHandler = handler;
        return undefined;
      },
    );
  });

  it('matches snapshot in loading state', () => {
    const { toJSON } = renderWithTheme(<HeadlessBuy />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows loading indicator and fetching quotes text', () => {
    const { getByText } = renderWithTheme(<HeadlessBuy />);

    expect(getByText('fiat_on_ramp.fetching_quotes')).toBeOnTheScreen();
  });

  it('calls setSelectedToken with assetId from params', () => {
    renderWithTheme(<HeadlessBuy />);

    expect(mockSetSelectedToken).toHaveBeenCalledWith(MOCK_PARAMS.assetId);
  });

  it('subscribes to RampsController:orderStatusChanged on mount', () => {
    renderWithTheme(<HeadlessBuy />);

    expect(mockSubscribe).toHaveBeenCalledWith(
      'RampsController:orderStatusChanged',
      expect.any(Function),
    );
  });

  it('unsubscribes from orderStatusChanged on unmount', () => {
    const { unmount } = renderWithTheme(<HeadlessBuy />);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'RampsController:orderStatusChanged',
      expect.any(Function),
    );
  });

  it('pops navigation when order reaches terminal status', async () => {
    renderWithTheme(<HeadlessBuy />);

    await act(() => {
      orderStatusHandler({
        order: { status: RampsOrderStatus.Completed },
        previousStatus: RampsOrderStatus.Pending,
      });
    });

    expect(mockPop).toHaveBeenCalled();
  });

  describe('error state', () => {
    it('shows error message and try again button when quote fetch fails', async () => {
      mockQuotesError = 'Network error';

      const { getByText } = renderWithTheme(<HeadlessBuy />);

      await waitFor(() => {
        expect(getByText('fiat_on_ramp_aggregator.error')).toBeOnTheScreen();
      });

      expect(getByText('Network error')).toBeOnTheScreen();
      expect(getByText('fiat_on_ramp_aggregator.try_again')).toBeOnTheScreen();
    });

    it('matches snapshot in error state', async () => {
      mockQuotesError = 'Quote fetch failed';

      const { toJSON, getByText } = renderWithTheme(<HeadlessBuy />);

      await waitFor(() => {
        expect(getByText('Quote fetch failed')).toBeOnTheScreen();
      });

      expect(toJSON()).toMatchSnapshot();
    });

    it('clears error when try again button is pressed', async () => {
      mockQuotesError = 'Network error';

      const { getByText } = renderWithTheme(<HeadlessBuy />);

      await waitFor(() => {
        expect(
          getByText('fiat_on_ramp_aggregator.try_again'),
        ).toBeOnTheScreen();
      });

      mockQuotesError = null;

      fireEvent.press(getByText('fiat_on_ramp_aggregator.try_again'));

      await waitFor(() => {
        expect(getByText('fiat_on_ramp.fetching_quotes')).toBeOnTheScreen();
      });
    });
  });

  describe('payment method not found', () => {
    it('shows error when paymentMethodId is not in paymentMethods', async () => {
      mockUseParams.mockReturnValue({
        ...MOCK_PARAMS,
        paymentMethodId: '/payments/nonexistent',
      });

      const { getByText } = renderWithTheme(<HeadlessBuy />);

      await waitFor(() => {
        expect(
          getByText('deposit.buildQuote.unexpectedError'),
        ).toBeOnTheScreen();
      });
    });
  });
});
