import React from 'react';
import {
  ProviderBuyFeatureBrowserEnum,
  QuoteError,
  QuoteResponse,
} from '@consensys/on-ramp-sdk';
import {
  act,
  fireEvent,
  screen,
  render as renderComponent,
} from '@testing-library/react-native';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';

import Quotes, { QuotesParams } from './Quotes';
import { mockQuotesData } from './Quotes.constants';
import Timer from './Timer';
import LoadingQuotes from './LoadingQuotes';

import { RampSDK } from '../../sdk';
import useSortedQuotes from '../../hooks/useSortedQuotes';

import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RampType } from '../../types';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.QUOTES,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

jest.unmock('react-redux');

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();
const mockTrackEvent = jest.fn();
const mockRenderInAppBrowser = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      goBack: mockGoBack,
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  selectedPaymentMethodId: '/payment-methods/test-payment-method',
  selectedChainId: '1',
  appConfig: {
    POLLING_CYCLES: 2,
    POLLING_INTERVAL: 10000,
    POLLING_INTERVAL_HIGHLIGHT: 1000,
  },
  callbackBaseUrl: '',
  sdkError: undefined,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);
jest.mock('../../hooks/useInAppBrowser', () => () => mockRenderInAppBrowser);

const mockUseParamsInitialValues: DeepPartial<QuotesParams> = {
  amount: 50,
  asset: {
    symbol: 'ETH',
  },
  fiatCurrency: {
    symbol: 'USD',
  },
};

let mockUseParamsValues = {
  ...mockUseParamsInitialValues,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsValues,
}));

const mockQueryGetQuotes = jest.fn();

const mockUseSortedQuotesInitialValues: Partial<
  ReturnType<typeof useSortedQuotes>
> = {
  quotes: mockQuotesData as (QuoteResponse | QuoteError)[],
  quotesWithoutError: mockQuotesData as QuoteResponse[],
  quotesWithError: [],
  quotesByPriceWithoutError: mockQuotesData as QuoteResponse[],
  quotesByReliabilityWithoutError: mockQuotesData as QuoteResponse[],
  recommendedQuote: mockQuotesData[1] as QuoteResponse,
  sorted: [],
  isFetching: false,
  error: null,
  query: mockQueryGetQuotes,
};

let mockUseSortedQuotesValues: Partial<ReturnType<typeof useSortedQuotes>> = {
  ...mockUseSortedQuotesInitialValues,
};

jest.mock('../../hooks/useSortedQuotes', () =>
  jest.fn(() => mockUseSortedQuotesValues),
);

describe('Quotes', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Quotes view uses a timer to poll for quotes, we use fake timers
    // to have control over the timer with jest timer methods
    // Reference: https://jestjs.io/docs/timer-mocks
    jest.useFakeTimers();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseParamsValues = {
      ...mockUseParamsInitialValues,
    };
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
    };
  });

  it('calls setOptions when rendering', async () => {
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      isFetching: true,
      quotes: undefined,
      quotesWithoutError: [],
      quotesWithError: [],
      quotesByPriceWithoutError: [],
      quotesByReliabilityWithoutError: [],
      recommendedQuote: undefined,
    };
    render(Quotes);
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('navigates and tracks event on cancel button press', async () => {
    render(Quotes);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Quotes Screen',
      results_count:
        mockUseSortedQuotesInitialValues.quotesByPriceWithoutError?.length,
    });
    act(() => {
      jest.useRealTimers();
    });
  });

  it('navigates and tracks event on SELL cancel button press', async () => {
    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.isBuy = false;
    render(Quotes);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockTrackEvent).toBeCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '1',
      location: 'Quotes Screen',
      results_count:
        mockUseSortedQuotesInitialValues.quotesByPriceWithoutError?.length,
    });
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders animation on first fetching', async () => {
    jest.useRealTimers();
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      isFetching: true,
      quotes: undefined,
    };
    render(Quotes);
    const fetchingQuotesText = screen.getByText('Fetching quotes');
    expect(fetchingQuotesText).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly after animation without quotes', async () => {
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      quotesWithoutError: [],
      quotesByPriceWithoutError: [],
      quotesByReliabilityWithoutError: [],
      recommendedQuote: undefined,
    };
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText('No providers available')).toBeTruthy();
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders correctly after animation with the recommended quote', async () => {
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });
    expect(screen.toJSON()).toMatchSnapshot();
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders correctly after animation with expanded quotes', async () => {
    render(Quotes);
    fireEvent.press(
      screen.getByRole('button', { name: 'Explore more options' }),
    );
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_QUOTES_EXPANDED",
        {
          "amount": 50,
          "chain_id_destination": "1",
          "currency_destination": "ETH",
          "currency_source": "USD",
          "payment_method_id": "/payment-methods/test-payment-method",
          "previously_used_count": 0,
          "provider_onramp_first": "Banxa (Staging)",
          "provider_onramp_list": [
            "Banxa (Staging)",
            "MoonPay (Staging)",
            "Transak (Staging)",
          ],
          "refresh_count": 1,
          "results_count": 3,
        },
      ]
    `);
    expect(screen.toJSON()).toMatchSnapshot();
    act(() => {
      jest.useRealTimers();
    });
  });

  const simulateQuoteSelection = async (
    browser: ProviderBuyFeatureBrowserEnum,
  ) => {
    const mockedRecommendedQuote =
      mockUseSortedQuotesInitialValues.recommendedQuote;

    if (!mockedRecommendedQuote) {
      throw new Error('No recommended quote found');
    }

    const mockQuoteProviderName = mockedRecommendedQuote?.provider
      ?.name as string;

    const mockedBuyAction = {
      browser,
      createWidget: () =>
        Promise.resolve({
          url: 'https://test-url.on-ramp.metamask',
          orderId: 'test-order-id',
          browser,
        }),
    };

    (mockedRecommendedQuote as QuoteResponse).buy = () =>
      Promise.resolve(mockedBuyAction);

    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      recommendedQuote: mockedRecommendedQuote,
    };
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    const quoteToSelect = screen.getByLabelText(mockQuoteProviderName);
    fireEvent.press(quoteToSelect);

    const quoteContinueButton = screen.getByRole('button', {
      name: `Continue with ${mockQuoteProviderName}`,
    });

    await act(async () => {
      fireEvent.press(quoteContinueButton);
    });

    return { mockedRecommendedQuote, mockedBuyAction };
  };

  it('navigates and tracks events when pressing buy button with app browser quote', async () => {
    const { mockedRecommendedQuote } = await simulateQuoteSelection(
      ProviderBuyFeatureBrowserEnum.AppBrowser,
    );
    expect(mockNavigate).toBeCalledTimes(1);
    expect(mockNavigate).toBeCalledWith(Routes.RAMP.CHECKOUT, {
      provider: mockedRecommendedQuote.provider,
      customOrderId: 'test-order-id',
      url: 'https://test-url.on-ramp.metamask',
    });
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_PROVIDER_SELECTED",
        {
          "amount": 50,
          "chain_id_destination": "1",
          "crypto_out": 0.0162,
          "currency_destination": "ETH",
          "currency_source": "USD",
          "exchange_rate": 2809.8765432098767,
          "gas_fee": 2.64,
          "is_best_rate": true,
          "is_most_reliable": true,
          "is_recommended": true,
          "payment_method_id": "/payment-methods/test-payment-method",
          "processing_fee": 1.8399999999999999,
          "provider_onramp": "MoonPay (Staging)",
          "quote_position": 1,
          "refresh_count": 1,
          "results_count": 3,
          "total_fee": 4.48,
        },
      ]
    `);
  });

  it('calls the correct analytics event when a sell provider is clicked', async () => {
    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.isBuy = false;

    await simulateQuoteSelection(ProviderBuyFeatureBrowserEnum.AppBrowser);

    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_PROVIDER_SELECTED",
        {
          "amount": 50,
          "chain_id_source": "1",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "exchange_rate": 2809.8765432098767,
          "fiat_out": 0.0162,
          "gas_fee": 2.64,
          "is_best_rate": true,
          "is_most_reliable": true,
          "is_recommended": true,
          "payment_method_id": "/payment-methods/test-payment-method",
          "processing_fee": 1.8399999999999999,
          "provider_offramp": "MoonPay (Staging)",
          "quote_position": 1,
          "refresh_count": 1,
          "results_count": 3,
          "total_fee": 4.48,
        },
      ]
    `);
  });

  it('calls renderInAppBrowser hook and tracks events when pressing buy button with in-app browser quote', async () => {
    const { mockedRecommendedQuote, mockedBuyAction } =
      await simulateQuoteSelection(
        ProviderBuyFeatureBrowserEnum.InAppOsBrowser,
      );

    expect(mockRenderInAppBrowser).toBeCalledWith(
      mockedBuyAction,
      mockedRecommendedQuote.provider,
      mockedRecommendedQuote.amountIn,
      mockedRecommendedQuote.fiat?.symbol,
    );

    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_PROVIDER_SELECTED",
        {
          "amount": 50,
          "chain_id_destination": "1",
          "crypto_out": 0.0162,
          "currency_destination": "ETH",
          "currency_source": "USD",
          "exchange_rate": 2809.8765432098767,
          "gas_fee": 2.64,
          "is_best_rate": true,
          "is_most_reliable": true,
          "is_recommended": true,
          "payment_method_id": "/payment-methods/test-payment-method",
          "processing_fee": 1.8399999999999999,
          "provider_onramp": "MoonPay (Staging)",
          "quote_position": 1,
          "refresh_count": 1,
          "results_count": 3,
          "total_fee": 4.48,
        },
      ]
    `);
  });

  it('calls the correct analytics event for in-app browser sell quotes', async () => {
    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.isBuy = false;

    await simulateQuoteSelection(ProviderBuyFeatureBrowserEnum.InAppOsBrowser);

    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_PROVIDER_SELECTED",
        {
          "amount": 50,
          "chain_id_source": "1",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "exchange_rate": 2809.8765432098767,
          "fiat_out": 0.0162,
          "gas_fee": 2.64,
          "is_best_rate": true,
          "is_most_reliable": true,
          "is_recommended": true,
          "payment_method_id": "/payment-methods/test-payment-method",
          "processing_fee": 1.8399999999999999,
          "provider_offramp": "MoonPay (Staging)",
          "quote_position": 1,
          "refresh_count": 1,
          "results_count": 3,
          "total_fee": 4.48,
        },
      ]
    `);
  });

  it('renders information when pressing quote provider logo', async () => {
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });

    const mockRecommendedQuote = mockUseSortedQuotesValues.recommendedQuote;

    if (!mockRecommendedQuote) {
      throw new Error('No recommended quote found');
    }

    const mockRecommendedProvider =
      mockRecommendedQuote.provider as QuoteResponse['provider'];

    const descriptionNotFound = screen.queryByText(
      mockRecommendedProvider.description,
    );
    expect(descriptionNotFound).toBeFalsy();

    const quoteProviderLogo = screen.getByLabelText(
      `${mockRecommendedProvider.name} logo`,
    );

    fireEvent.press(quoteProviderLogo);

    const description = screen.queryByText(mockRecommendedProvider.description);
    expect(description).toBeTruthy();

    act(() => {
      jest.useRealTimers();
    });
  });

  it('calls fetch quotes after quotes expire', async () => {
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(15000);
      jest.clearAllTimers();
    });
    expect(mockQueryGetQuotes).toHaveBeenCalledTimes(1);
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders "quotes expire" text in the last cycle', async () => {
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(15000);
      jest.clearAllTimers();
    });
    expect(screen.getByText('Quotes expire in', { exact: false })).toBeTruthy();
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders quotes expired screen', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      appConfig: {
        ...mockUseRampSDKInitialValues.appConfig,
        POLLING_CYCLES: 0,
      },
    };
    render(Quotes);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText('Quotes timeout', { exact: false })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Get new quotes' }));
    expect(mockQueryGetQuotes).toHaveBeenCalledTimes(1);
    act(() => {
      jest.useRealTimers();
    });
  });

  it('calls track event on quotes received and quote error', async () => {
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });
    expect(mockTrackEvent.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "ONRAMP_QUOTES_RECEIVED",
          {
            "amount": 50,
            "average_crypto_out": 0.016416043333333335,
            "average_gas_fee": 1.0466666666666666,
            "average_processing_fee": 2.89,
            "average_total_fee": 3.936666666666667,
            "average_total_fee_of_amount": 382.4978079068538,
            "chain_id_destination": "1",
            "currency_destination": "ETH",
            "currency_source": "USD",
            "payment_method_id": "/payment-methods/test-payment-method",
            "provider_onramp_best_price": "Banxa (Staging)",
            "provider_onramp_first": "Banxa (Staging)",
            "provider_onramp_last": "Transak (Staging)",
            "provider_onramp_list": [
              "Banxa (Staging)",
              "MoonPay (Staging)",
              "Transak (Staging)",
            ],
            "provider_onramp_most_reliable": "MoonPay (Staging)",
            "quotes_amount_first": 0.017142,
            "quotes_amount_last": 0.01590613,
            "quotes_amount_list": [
              0.017142,
              0.0162,
              0.01590613,
            ],
            "refresh_count": 1,
            "results_count": 3,
          },
        ],
      ]
    `);
    act(() => {
      jest.useRealTimers();
    });
  });

  it('calls track event on sell quotes received and sell quote error', async () => {
    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.isBuy = false;
    render(Quotes);
    act(() => {
      jest.advanceTimersByTime(3000);
      jest.clearAllTimers();
    });
    expect(mockTrackEvent.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "OFFRAMP_QUOTES_RECEIVED",
          {
            "amount": 50,
            "average_fiat_out": 0.016416043333333335,
            "average_gas_fee": 1.0466666666666666,
            "average_processing_fee": 2.89,
            "average_total_fee": 3.936666666666667,
            "average_total_fee_of_amount": 382.4978079068538,
            "chain_id_source": "1",
            "currency_destination": "USD",
            "currency_source": "ETH",
            "payment_method_id": "/payment-methods/test-payment-method",
            "provider_offramp_best_price": "Banxa (Staging)",
            "provider_offramp_first": "Banxa (Staging)",
            "provider_offramp_last": "Transak (Staging)",
            "provider_offramp_list": [
              "Banxa (Staging)",
              "MoonPay (Staging)",
              "Transak (Staging)",
            ],
            "provider_offramp_most_reliable": "MoonPay (Staging)",
            "quotes_amount_first": 0.017142,
            "quotes_amount_last": 0.01590613,
            "quotes_amount_list": [
              0.017142,
              0.0162,
              0.01590613,
            ],
            "refresh_count": 1,
            "results_count": 3,
          },
        ],
      ]
    `);
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders correctly with sdkError', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('Example SDK Error'),
    };
    render(Quotes);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText('Example SDK Error')).toBeTruthy();
    act(() => {
      jest.useRealTimers();
    });
  });

  it('navigates to home when clicking sdKError button', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('Example SDK Error'),
    };
    render(Quotes);
    fireEvent.press(
      screen.getByRole('button', { name: 'Return to Home Screen' }),
    );
    expect(mockPop).toBeCalledTimes(1);
    act(() => {
      jest.useRealTimers();
    });
  });

  it('renders correctly when fetching quotes errors', async () => {
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      error: 'Test Error',
    };
    render(Quotes);
    expect(screen.toJSON()).toMatchSnapshot();
    act(() => {
      jest.useRealTimers();
    });
  });

  it('fetches quotes again when pressing button after fetching quotes errors', async () => {
    mockUseSortedQuotesValues = {
      ...mockUseSortedQuotesInitialValues,
      error: 'Test Error',
    };
    render(Quotes);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockQueryGetQuotes).toBeCalledTimes(1);
    act(() => {
      jest.useRealTimers();
    });
  });
});

describe('LoadingQuotes component', () => {
  it('renders correctly', () => {
    renderComponent(<LoadingQuotes />);
    expect(screen.toJSON()).toMatchSnapshot();
  });
});

describe('Timer component', () => {
  it.each`
    isFetchingQuotes | pollingCyclesLeft | remainingTime
    ${true}          | ${1}              | ${15000}
    ${true}          | ${1}              | ${5000}
    ${true}          | ${0}              | ${15000}
    ${true}          | ${0}              | ${5000}
    ${false}         | ${1}              | ${15000}
    ${false}         | ${1}              | ${5000}
    ${false}         | ${0}              | ${15000}
    ${false}         | ${0}              | ${5000}
    ${false}         | ${0}              | ${20000}
  `(
    'renders correctly with isFetchingQuotes=$isFetchingQuotes, pollingCyclesLeft=$pollingCyclesLeft, remainingTime=$remainingTime',
    ({
      isFetchingQuotes,
      pollingCyclesLeft,
      remainingTime,
    }: {
      isFetchingQuotes: boolean;
      pollingCyclesLeft: number;
      remainingTime: number;
    }) => {
      renderComponent(
        <Timer
          isFetchingQuotes={isFetchingQuotes}
          pollingCyclesLeft={pollingCyclesLeft}
          remainingTime={remainingTime}
        />,
      );
      expect(screen.toJSON()).toMatchSnapshot();
    },
  );
});
