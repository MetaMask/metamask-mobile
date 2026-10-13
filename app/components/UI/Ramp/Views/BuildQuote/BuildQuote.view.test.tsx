import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderV2BuildQuoteView,
  renderV2BuildQuoteWithRoutes,
  wireRampsControllerForStore,
  TRANSACTIONS_VIEW_PLACEHOLDER_TEXT,
} from '../../../../../../tests/component-view/renderers/ramps';
import { MULTICHAIN_TEST_ACCOUNTS } from '../../../../../../tests/component-view/presets/multichainAccounts';
import Engine from '../../../../../core/Engine';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { BUILD_QUOTE_TEST_IDS } from './BuildQuote.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const ETH_ASSET_ID = 'eip155:1/slip44:60';
const ETH_CHAIN_ID = 'eip155:1';
const TEST_WALLET_ADDRESS = MULTICHAIN_TEST_ACCOUNTS.account1.address;

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

const buildQuote = (provider: string, paymentMethodId: string, id: string) => ({
  provider,
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

const DEBIT_CARD_QUOTE = buildQuote(
  'transak',
  DEBIT_CARD_PAYMENT_METHOD.id,
  'quote-card',
);
const APPLE_PAY_QUOTE = buildQuote(
  'transak',
  APPLE_PAY_PAYMENT_METHOD.id,
  'quote-applepay',
);
const MOONPAY_DEBIT_CARD_QUOTE = buildQuote(
  'moonpay',
  DEBIT_CARD_PAYMENT_METHOD.id,
  'quote-moonpay-card',
);
const NATIVE_DEBIT_CARD_QUOTE = {
  ...DEBIT_CARD_QUOTE,
  providerInfo: { type: 'native' as const },
};
const WIDGET_CHECKOUT_URL = 'https://widget.example.com/session';

function providerWithBuyLimit(minAmount: number, maxAmount: number) {
  return {
    ...TRANSAK_PROVIDER,
    limits: {
      fiat: {
        usd: {
          [DEBIT_CARD_PAYMENT_METHOD.id]: {
            minAmount,
            maxAmount,
            feeFixedRate: 0,
            feeDynamicRate: 0,
          },
        },
      },
    },
  };
}

type ProviderRecord = Omit<
  typeof TRANSAK_PROVIDER,
  'supportedCryptoCurrencies'
> & {
  supportedCryptoCurrencies: Record<string, boolean>;
};

import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';

function buildV2RampsState(
  options: {
    providers?: ProviderRecord[];
    selectedProvider?: ProviderRecord;
  } = {},
): DeepPartial<RootState> {
  const providers = options.providers ?? [TRANSAK_PROVIDER];
  const selectedProvider =
    options.selectedProvider ?? providers[0] ?? TRANSAK_PROVIDER;

  return {
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: {
              [MULTICHAIN_TEST_ACCOUNTS.account1.id]: {
                id: MULTICHAIN_TEST_ACCOUNTS.account1.id,
                address: MULTICHAIN_TEST_ACCOUNTS.account1.address,
                type: 'eip155:eoa',
                scopes: ['eip155:1'],
                options: {},
                methods: [],
                metadata: {
                  name: MULTICHAIN_TEST_ACCOUNTS.account1.name,
                  keyring: { type: 'HD Key Tree' },
                  importTime: 1,
                  lastSelected: 1,
                },
              },
            },
            selectedAccount: MULTICHAIN_TEST_ACCOUNTS.account1.id,
          },
        },
        AccountTreeController: {
          selectedAccountGroup: 'entropy:wallet1/0',
          accountTree: {
            wallets: {
              'entropy:wallet1': {
                id: 'entropy:wallet1',
                groups: {
                  'entropy:wallet1/0': {
                    id: 'entropy:wallet1/0',
                    accounts: [MULTICHAIN_TEST_ACCOUNTS.account1.id],
                  },
                },
              },
            },
          },
        },
        RampsController: {
          userRegion: US_REGION,
          countries: {
            data: [],
            selected: null,
            isLoading: false,
            error: null,
          },
          providers: {
            data: providers,
            selected: selectedProvider,
            isLoading: false,
            error: null,
          },
          tokens: {
            data: {
              topTokens: [SELECTED_TOKEN],
              allTokens: [SELECTED_TOKEN],
            },
            selected: SELECTED_TOKEN,
            isLoading: false,
            error: null,
          },
          paymentMethods: {
            data: [DEBIT_CARD_PAYMENT_METHOD, APPLE_PAY_PAYMENT_METHOD],
            selected: DEBIT_CARD_PAYMENT_METHOD,
            isLoading: false,
            error: null,
          },
          orders: [],
          providerAutoSelected: false,
        },
      },
    },
  } as unknown as DeepPartial<RootState>;
}

function setupV2Hooks(
  options: {
    providers?: ProviderRecord[];
    initialSelectedProvider?: ProviderRecord;
    quotes?: { success: unknown[]; error: unknown[] };
    quoteError?: Error;
  } = {},
) {
  const providers = options.providers ?? [TRANSAK_PROVIDER];
  const selectedProvider =
    options.initialSelectedProvider ?? providers[0] ?? TRANSAK_PROVIDER;

  (Engine.context.RampsController.getProviders as jest.Mock)
    .mockReset()
    .mockResolvedValue({ providers });
  (Engine.context.RampsController.getPaymentMethodsForContext as jest.Mock)
    .mockReset()
    .mockResolvedValue({
      methods: [DEBIT_CARD_PAYMENT_METHOD, APPLE_PAY_PAYMENT_METHOD],
      selected: DEBIT_CARD_PAYMENT_METHOD,
    });

  const getQuotesMock = Engine.context.RampsController.getQuotes as jest.Mock;
  getQuotesMock.mockReset();
  if (options.quoteError) {
    getQuotesMock.mockRejectedValue(options.quoteError);
  } else if (options.quotes) {
    getQuotesMock.mockResolvedValue(options.quotes);
  } else {
    getQuotesMock.mockImplementation((params?: { providers?: string[] }) => {
      const providerId = params?.providers?.[0] ?? 'transak';
      if (providerId === 'moonpay') {
        return Promise.resolve({
          success: [MOONPAY_DEBIT_CARD_QUOTE],
          error: [],
        });
      }
      return Promise.resolve({
        success: [DEBIT_CARD_QUOTE, APPLE_PAY_QUOTE],
        error: [],
      });
    });
  }

  const stateOverrides = buildV2RampsState({ providers, selectedProvider });
  return { getQuotesMock, stateOverrides };
}

function pressContinue(
  getByTestId: (testId: string) => {
    props: Record<string, unknown>;
    parent?: unknown;
  },
) {
  let node: { props: Record<string, unknown>; parent?: unknown } | undefined =
    getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent as typeof node | undefined;
  }
  const onPress = node?.props.onPress as (() => Promise<void>) | undefined;
  if (!onPress) {
    throw new Error('Continue button has no onPress handler');
  }
  return onPress();
}

describe('V2 unified-buy BuildQuote', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes from a V2 deeplink with assetId only — region default amount, not URL amount', async () => {
    const { stateOverrides } = setupV2Hooks();

    const { findByText, queryByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
    });

    expect(await findByText('Buy ETH')).toBeOnTheScreen();
    expect(await findByText('on Ethereum Main Network')).toBeOnTheScreen();
    expect(await findByText(/100/)).toBeOnTheScreen();
    expect(queryByText(/275/)).not.toBeOnTheScreen();
  });

  it('honors an explicit amount route param when provided', async () => {
    const { stateOverrides } = setupV2Hooks();

    const { findByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID, amount: 250 },
      overrides: stateOverrides,
    });

    expect(await findByText(/250/)).toBeOnTheScreen();
  });

  it('navigates from settings cog to TransactionsView order history', async () => {
    const { stateOverrides } = setupV2Hooks();

    const { findByText, findByTestId } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
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
    const { stateOverrides } = setupV2Hooks();

    const { findByTestId, findByText } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
      includePaymentSelectionRoute: true,
    });

    fireEvent.press(await findByTestId(BUILD_QUOTE_TEST_IDS.PAYMENT_PILL));

    expect(await findByText('Pay with')).toBeOnTheScreen();
    expect(await findByText('Apple Pay')).toBeOnTheScreen();
  });

  it('fetches V2 quotes via RampsController.getQuotes and surfaces the matched provider', async () => {
    const { getQuotesMock, stateOverrides } = setupV2Hooks();

    const { findByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
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
    const { stateOverrides } = setupV2Hooks({
      providers: [TRANSAK_PROVIDER, MOONPAY_PROVIDER],
      initialSelectedProvider: TRANSAK_PROVIDER,
    });

    const result = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
      includePaymentSelectionRoute: true,
      includeProviderSelectionRoute: true,
    });
    wireRampsControllerForStore(result.store);

    const { findByText, findByTestId, getByTestId, getByText, queryByText } =
      result;

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();

    // Wait for payment methods to load — pill shows label only in non-loading (interactive) state
    await findByText('Debit/Credit Card');
    fireEvent.press(getByTestId(BUILD_QUOTE_TEST_IDS.PAYMENT_PILL));

    expect(await findByText(/Buying via Transak/)).toBeOnTheScreen();

    fireEvent.press(await findByText('Change provider.'));

    expect(await findByText('Providers')).toBeOnTheScreen();
    expect(await findByText('MoonPay')).toBeOnTheScreen();

    fireEvent.press(await findByText('MoonPay'));

    await waitFor(() => {
      expect(queryByText('Providers')).not.toBeOnTheScreen();
      expect(getByText('Powered by MoonPay')).toBeOnTheScreen();
    });

    const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
    expect(
      (amountInput.props.children as unknown[])
        .filter((child) => typeof child === 'string')
        .join(''),
    ).toContain('100');
  });

  it('updates the displayed amount when a quick-amount chip is tapped', async () => {
    const { stateOverrides } = setupV2Hooks();

    const { findByTestId, findByText, getByTestId } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
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

  it('opens checkout with the widget url when Continue is pressed on a provider quote', async () => {
    const { stateOverrides } = setupV2Hooks();
    (Engine.context.RampsController.getBuyWidgetData as jest.Mock)
      .mockReset()
      .mockResolvedValue({
        url: WIDGET_CHECKOUT_URL,
        orderId: 'order-1',
      });

    const { findByText, findByTestId, getByTestId } =
      renderV2BuildQuoteWithRoutes({
        initialParams: { assetId: ETH_ASSET_ID },
        overrides: stateOverrides,
        includeContinueRoutes: true,
      });

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON).props
          .accessibilityState?.disabled,
      ).not.toBe(true);
    });
    await act(async () => {
      await pressContinue(getByTestId);
    });

    expect(
      String(
        (await findByTestId(`route-${Routes.RAMP.CHECKOUT}`)).props.children,
      ),
    ).toContain(WIDGET_CHECKOUT_URL);
  });

  it('opens identity verification when Continue is pressed for a first-time Transak user', async () => {
    const { stateOverrides } = setupV2Hooks({
      quotes: { success: [NATIVE_DEBIT_CARD_QUOTE], error: [] },
    });

    const { findByText, findByTestId, getByTestId } =
      renderV2BuildQuoteWithRoutes({
        initialParams: { assetId: ETH_ASSET_ID },
        overrides: stateOverrides,
        includeContinueRoutes: true,
      });

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON).props
          .accessibilityState?.disabled,
      ).not.toBe(true);
    });
    await act(async () => {
      await pressContinue(getByTestId);
    });

    const identity = await findByTestId(`route-${Routes.RAMP.VERIFY_IDENTITY}`);
    expect(String(identity.props.children)).toContain(ETH_ASSET_ID);
    expect(String(identity.props.children)).toContain('"amount":"100"');
  });

  it('opens the email screen when Continue is pressed after the Transak policy is accepted', async () => {
    const { stateOverrides } = setupV2Hooks({
      quotes: { success: [NATIVE_DEBIT_CARD_QUOTE], error: [] },
    });

    const { findByText, findByTestId, getByTestId } =
      renderV2BuildQuoteWithRoutes({
        initialParams: { assetId: ETH_ASSET_ID },
        overrides: {
          ...stateOverrides,
          fiatOrders: { hasAgreedTransakNativePolicy: true },
        },
        includeContinueRoutes: true,
      });

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();
    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON).props
          .accessibilityState?.disabled,
      ).not.toBe(true);
    });
    await act(async () => {
      await pressContinue(getByTestId);
    });

    expect(
      String(
        (await findByTestId(`route-${Routes.RAMP.ENTER_EMAIL}`)).props.children,
      ),
    ).toContain(ETH_ASSET_ID);
  });

  it('shows the minimum purchase error and does not request a quote when the amount is too low', async () => {
    const limitedProvider = providerWithBuyLimit(200, 1000);
    const { getQuotesMock, stateOverrides } = setupV2Hooks({
      providers: [limitedProvider],
      initialSelectedProvider: limitedProvider,
    });

    const { findByText, getByTestId } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID, amount: 100 },
      overrides: stateOverrides,
    });

    expect(await findByText(/Minimum purchase is/)).toBeOnTheScreen();
    expect(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON)).toBeDisabled();
    expect(getQuotesMock).not.toHaveBeenCalled();
  });

  it('shows an error banner when the quote request fails', async () => {
    const { stateOverrides } = setupV2Hooks({
      quoteError: new Error('Quote fetch failed'),
    });

    const { findByText } = renderV2BuildQuoteView({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
    });

    expect(await findByText('Quote fetch failed')).toBeOnTheScreen();
  });

  it('updates the payment method when Apple Pay is selected', async () => {
    const { getQuotesMock, stateOverrides } = setupV2Hooks();

    const result = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
      includePaymentSelectionRoute: true,
      wireRampsController: true,
    });
    const { findByText, getByTestId, queryByText } = result;

    await findByText('Debit/Credit Card');
    fireEvent.press(getByTestId(BUILD_QUOTE_TEST_IDS.PAYMENT_PILL));
    fireEvent.press(await findByText('Apple Pay'));

    await waitFor(() => {
      expect(queryByText('Pay with')).not.toBeOnTheScreen();
      expect(getQuotesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethods: [APPLE_PAY_PAYMENT_METHOD.id],
        }),
      );
    });
    expect(result.getByText('Apple Pay')).toBeOnTheScreen();
  });

  it('switches to a provider that supports the selected token', async () => {
    const transakWithoutEth = {
      ...TRANSAK_PROVIDER,
      supportedCryptoCurrencies: {
        'eip155:1/erc20:0x0000000000000000000000000000000000000001': true,
      },
    };
    const { stateOverrides } = setupV2Hooks({
      providers: [transakWithoutEth, MOONPAY_PROVIDER],
      initialSelectedProvider: transakWithoutEth,
    });

    const { findByText, queryByTestId } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
      includeTokenNotAvailableRoute: true,
      wireRampsController: true,
    });

    expect(await findByText('Powered by MoonPay')).toBeOnTheScreen();
    expect(
      queryByTestId(`route-${Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE}`),
    ).not.toBeOnTheScreen();
  });

  it('opens the token not available sheet when no provider supports the token', async () => {
    const transakWithoutEth = {
      ...TRANSAK_PROVIDER,
      supportedCryptoCurrencies: {},
    };
    const { stateOverrides } = setupV2Hooks({
      providers: [transakWithoutEth],
      initialSelectedProvider: transakWithoutEth,
    });

    const { getByTestId, queryByText } = renderV2BuildQuoteWithRoutes({
      initialParams: { assetId: ETH_ASSET_ID },
      overrides: stateOverrides,
      includeTokenNotAvailableRoute: true,
      wireRampsController: true,
    });

    await waitFor(
      () => {
        expect(
          String(
            getByTestId(`route-${Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE}`).props
              .children,
          ),
        ).toContain(ETH_ASSET_ID);
      },
      { timeout: 4000 },
    );
    expect(queryByText('Powered by Transak')).not.toBeOnTheScreen();
  });
});
