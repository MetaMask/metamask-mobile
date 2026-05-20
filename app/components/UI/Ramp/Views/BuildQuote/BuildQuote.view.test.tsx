import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn requires a live module namespace object; named imports are local copies that spyOn cannot intercept
import * as useRampsControllerHook from '../../hooks/useRampsController';
// eslint-disable-next-line import-x/no-namespace
import * as useContinueWithQuoteHook from '../../hooks/useContinueWithQuote';
// eslint-disable-next-line import-x/no-namespace
import * as useRampAccountAddressHook from '../../hooks/useRampAccountAddress';
// eslint-disable-next-line import-x/no-namespace
import * as useTokenNetworkInfoHook from '../../hooks/useTokenNetworkInfo';
// eslint-disable-next-line import-x/no-namespace
import * as useRampsProvidersHook from '../../hooks/useRampsProviders';

import {
  renderV2BuildQuoteView,
  renderV2BuildQuoteWithRoutes,
  TRANSACTIONS_VIEW_PLACEHOLDER_TEXT,
} from '../../../../../../tests/component-view/renderers/ramps';
import Engine from '../../../../../core/Engine';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { BUILD_QUOTE_TEST_IDS } from './BuildQuote.testIds';

const ETH_ASSET_ID = 'eip155:1/slip44:60';
const ETH_CHAIN_ID = 'eip155:1';
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

const TRANSAK_PROVIDER = {
  id: 'transak',
  name: 'Transak',
  supportedCryptoCurrencies: { [ETH_ASSET_ID]: true },
  links: [] as { name: string; url: string }[],
};

const MOONPAY_PROVIDER = {
  id: 'moonpay',
  name: 'MoonPay',
  supportedCryptoCurrencies: { [ETH_ASSET_ID]: true },
  links: [] as { name: string; url: string }[],
};

const SELECTED_TOKEN = {
  assetId: ETH_ASSET_ID,
  chainId: ETH_CHAIN_ID,
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
};

const DEBIT_CARD_PAYMENT_METHOD = {
  id: '/payments/debit-credit-card',
  name: 'Debit/Credit Card',
  isManualBankTransfer: false,
  paymentType: 'debit-credit-card' as const,
  icons: [] as never[],
};

const APPLE_PAY_PAYMENT_METHOD = {
  id: '/payments/apple-pay',
  name: 'Apple Pay',
  isManualBankTransfer: false,
  paymentType: 'apple-pay' as const,
  icons: [] as never[],
};

const US_REGION = {
  country: {
    currency: 'USD',
    isoCode: 'US',
    defaultAmount: 100,
    quickAmounts: [50, 100, 200, 400],
  },
  regionCode: 'us-ca',
};

const buildQuote = (paymentMethodId: string, id: string) => ({
  provider: 'transak',
  id,
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: ETH_ASSET_ID },
  quote: {
    paymentMethod: paymentMethodId,
    buyURL: 'https://widget.example.com/checkout',
  },
});

const DEBIT_CARD_QUOTE = buildQuote(DEBIT_CARD_PAYMENT_METHOD.id, 'quote-card');
const APPLE_PAY_QUOTE = buildQuote(
  APPLE_PAY_PAYMENT_METHOD.id,
  'quote-applepay',
);

type UseRampsControllerReturn = ReturnType<
  typeof useRampsControllerHook.useRampsController
>;

type UseRampsControllerOverrides = Partial<UseRampsControllerReturn>;

type ProviderRecord = typeof TRANSAK_PROVIDER;

/**
 * Reactive store that lets multiple components rendered through the spied
 * `useRampsController` share a `selectedProvider`/`selectedPaymentMethod`
 * source of truth. Calling the setters notifies every subscribed component
 * via `useReducer`-forced re-render — mirroring how the real V2 controller
 * propagates state through its messenger.
 *
 * Reset to defaults in `setupV2Hooks` so each test starts clean.
 */
const v2SharedState: {
  selectedProvider: ProviderRecord;
  providers: ProviderRecord[];
  subscribers: Set<() => void>;
} = {
  selectedProvider: TRANSAK_PROVIDER,
  providers: [TRANSAK_PROVIDER],
  subscribers: new Set(),
};

function notifyV2Subscribers() {
  v2SharedState.subscribers.forEach((cb) => cb());
}

function useV2SharedStateSubscription() {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    v2SharedState.subscribers.add(force);
    return () => {
      v2SharedState.subscribers.delete(force);
    };
  }, []);
}

function setV2SelectedProvider(provider: ProviderRecord) {
  v2SharedState.selectedProvider = provider;
  notifyV2Subscribers();
}

function buildRampsControllerResult(
  overrides: UseRampsControllerOverrides = {},
): UseRampsControllerReturn {
  return {
    userRegion: US_REGION,
    setUserRegion: jest.fn(),
    providers: v2SharedState.providers,
    selectedProvider: v2SharedState.selectedProvider,
    setSelectedProvider: setV2SelectedProvider,
    providersLoading: false,
    providersError: null,
    tokens: [SELECTED_TOKEN],
    selectedToken: SELECTED_TOKEN,
    setSelectedToken: jest.fn(),
    tokensLoading: false,
    tokensError: null,
    countries: [],
    countriesLoading: false,
    countriesError: null,
    paymentMethods: [DEBIT_CARD_PAYMENT_METHOD, APPLE_PAY_PAYMENT_METHOD],
    selectedPaymentMethod: DEBIT_CARD_PAYMENT_METHOD,
    setSelectedPaymentMethod: jest.fn(),
    paymentMethodsLoading: false,
    paymentMethodsFetching: false,
    paymentMethodsStatus: 'success',
    paymentMethodsError: null,
    getQuotes: jest.fn(),
    getBuyWidgetData: jest.fn(),
    orders: [],
    getOrderById: jest.fn(),
    addOrder: jest.fn(),
    addPrecreatedOrder: jest.fn(),
    removeOrder: jest.fn(),
    refreshOrder: jest.fn(),
    getOrderFromCallback: jest.fn(),
    ...overrides,
  } as UseRampsControllerReturn;
}

/**
 * Stubs the V2 hook surface that has no controller-backed equivalent in the
 * CV environment (network info, account address, etc.) and seeds
 * `RampsController.getQuotes` with a deterministic resolved value. The
 * `useRampsQuotes` hook itself is intentionally NOT spied on — react-query
 * runs for real and resolves through the controller stub, exercising the
 * full quote pipeline (`useRampsQuotes` → react-query → `Engine.context.RampsController.getQuotes`).
 */
function setupV2Hooks(
  overrides: {
    controller?: UseRampsControllerOverrides;
    providers?: ProviderRecord[];
    initialSelectedProvider?: ProviderRecord;
  } = {},
) {
  v2SharedState.subscribers.clear();
  v2SharedState.providers = overrides.providers ?? [TRANSAK_PROVIDER];
  v2SharedState.selectedProvider =
    overrides.initialSelectedProvider ??
    v2SharedState.providers[0] ??
    TRANSAK_PROVIDER;

  jest
    .spyOn(useRampsControllerHook, 'useRampsController')
    .mockImplementation(() => {
      useV2SharedStateSubscription();
      return buildRampsControllerResult(overrides.controller);
    });
  jest.spyOn(useContinueWithQuoteHook, 'useContinueWithQuote').mockReturnValue({
    continueWithQuote: jest.fn().mockResolvedValue(undefined),
  });
  jest
    .spyOn(useRampAccountAddressHook, 'default')
    .mockReturnValue(TEST_WALLET_ADDRESS);
  jest
    .spyOn(useTokenNetworkInfoHook, 'useTokenNetworkInfo')
    .mockReturnValue(() => ({
      networkName: 'Ethereum Mainnet',
      depositNetworkName: 'Ethereum',
      networkImageSource: { uri: 'mock' },
    }));
  jest.spyOn(useRampsProvidersHook, 'useRampsProviders').mockReturnValue({
    providers: [TRANSAK_PROVIDER],
    selectedProvider: TRANSAK_PROVIDER,
    setSelectedProvider: jest.fn(),
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useRampsProvidersHook.useRampsProviders>);

  const getQuotesMock = Engine.context.RampsController.getQuotes as jest.Mock;
  getQuotesMock.mockReset().mockResolvedValue({
    success: [DEBIT_CARD_QUOTE, APPLE_PAY_QUOTE],
    error: [],
  });

  return { getQuotesMock };
}

describe('V2 unified-buy BuildQuote', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes from a V2 deeplink with assetId only — region default amount, not URL amount', async () => {
    setupV2Hooks();

    const { findByText, queryByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
    });

    expect(await findByText('Buy ETH')).toBeOnTheScreen();
    expect(await findByText('on Ethereum Mainnet')).toBeOnTheScreen();
    expect(await findByText(/100/)).toBeOnTheScreen();
    expect(queryByText(/275/)).not.toBeOnTheScreen();
  });

  it('honors an explicit amount route param when provided', async () => {
    setupV2Hooks();

    const { findByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID, amount: 250 },
    });

    expect(await findByText(/250/)).toBeOnTheScreen();
  });

  it('navigates from settings cog to TransactionsView order history', async () => {
    setupV2Hooks();

    const { findByText, findByTestId } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      includeBuySettingsAndTransactionsRoutes: true,
    });

    fireEvent.press(await findByTestId(BUILD_QUOTE_TEST_IDS.SETTINGS_BUTTON));

    expect(await findByText('View order history')).toBeOnTheScreen();

    fireEvent.press(await findByText('View order history'));

    expect(
      await findByText(
        new RegExp(
          `${TRANSACTIONS_VIEW_PLACEHOLDER_TEXT} redirectToOrders=true`,
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('opens the V2 PaymentSelectionModal when tapping the payment pill', async () => {
    setupV2Hooks();

    const { findByTestId, findByText } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      includePaymentSelectionRoute: true,
    });

    fireEvent.press(await findByTestId('build-quote-payment-pill'));

    expect(await findByText('Pay with')).toBeOnTheScreen();
    expect(await findByText('Apple Pay')).toBeOnTheScreen();
  });

  it('fetches V2 quotes via RampsController.getQuotes and surfaces the matched provider', async () => {
    const { getQuotesMock } = setupV2Hooks();

    const { findByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
    });

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();

    await waitFor(() => {
      expect(getQuotesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: ETH_ASSET_ID,
          amount: 100,
          walletAddress: TEST_WALLET_ADDRESS,
          paymentMethods: [DEBIT_CARD_PAYMENT_METHOD.id],
          providers: [TRANSAK_PROVIDER.id],
        }),
      );
    });
  });

  it('updates the displayed provider name when a different provider is selected', async () => {
    setupV2Hooks({
      providers: [TRANSAK_PROVIDER, MOONPAY_PROVIDER],
      initialSelectedProvider: TRANSAK_PROVIDER,
    });

    const { findByTestId, findByText } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      includePaymentSelectionRoute: true,
      includeProviderSelectionRoute: true,
    });

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();

    fireEvent.press(await findByTestId('build-quote-payment-pill'));

    expect(await findByText(/Buying via Transak/)).toBeOnTheScreen();

    fireEvent.press(await findByText('Change provider.'));

    expect(await findByText('Providers')).toBeOnTheScreen();
    expect(await findByText('MoonPay')).toBeOnTheScreen();

    fireEvent.press(await findByText('MoonPay'));

    expect(await findByText(/Buying via MoonPay/)).toBeOnTheScreen();
  });

  it('updates the displayed amount when a quick-amount chip is tapped', async () => {
    setupV2Hooks();

    const { findByTestId, findByText, getByTestId } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
    });

    expect(
      await findByTestId(BuildQuoteSelectors.AMOUNT_INPUT),
    ).toBeOnTheScreen();

    const deleteKey = getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON);
    for (let i = 0; i < 4; i += 1) {
      fireEvent.press(deleteKey);
    }

    fireEvent.press(await findByText('$50'));

    await waitFor(() => {
      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      const text = (amountInput.props.children as unknown[])
        .filter((c) => typeof c === 'string')
        .join('');
      expect(text).toContain('50');
    });
  });
});
