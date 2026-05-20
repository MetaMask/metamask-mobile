import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn requires a live module namespace object; named imports are local copies that spyOn cannot intercept
import * as useContinueWithQuoteHook from '../../hooks/useContinueWithQuote';
// eslint-disable-next-line import-x/no-namespace
import * as useRampAccountAddressHook from '../../hooks/useRampAccountAddress';

import {
  renderV2BuildQuoteView,
  renderV2BuildQuoteWithRoutes,
  wireRampsControllerForStore,
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

type ProviderRecord = typeof TRANSAK_PROVIDER;

function buildV2RampsState(
  options: {
    providers?: ProviderRecord[];
    selectedProvider?: ProviderRecord;
  } = {},
) {
  const providers = options.providers ?? [TRANSAK_PROVIDER];
  const selectedProvider =
    options.selectedProvider ?? providers[0] ?? TRANSAK_PROVIDER;

  return {
    engine: {
      backgroundState: {
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
  };
}

function setupV2Hooks(
  options: {
    providers?: ProviderRecord[];
    initialSelectedProvider?: ProviderRecord;
  } = {},
) {
  const providers = options.providers ?? [TRANSAK_PROVIDER];
  const selectedProvider =
    options.initialSelectedProvider ?? providers[0] ?? TRANSAK_PROVIDER;

  jest.spyOn(useContinueWithQuoteHook, 'useContinueWithQuote').mockReturnValue({
    continueWithQuote: jest.fn().mockResolvedValue(undefined),
  });
  jest
    .spyOn(useRampAccountAddressHook, 'default')
    .mockReturnValue(TEST_WALLET_ADDRESS);

  (Engine.context.RampsController.getProviders as jest.Mock)
    .mockReset()
    .mockResolvedValue({ providers });
  (Engine.context.RampsController.getPaymentMethods as jest.Mock)
    .mockReset()
    .mockResolvedValue({
      payments: [DEBIT_CARD_PAYMENT_METHOD, APPLE_PAY_PAYMENT_METHOD],
    });

  const getQuotesMock = Engine.context.RampsController.getQuotes as jest.Mock;
  getQuotesMock.mockReset().mockResolvedValue({
    success: [DEBIT_CARD_QUOTE, APPLE_PAY_QUOTE],
    error: [],
  });

  const stateOverrides = buildV2RampsState({ providers, selectedProvider });
  return { getQuotesMock, stateOverrides };
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

    const { findByTestId, findByText } = result;

    expect(await findByText('Powered by Transak')).toBeOnTheScreen();

    fireEvent.press(await findByTestId(BUILD_QUOTE_TEST_IDS.PAYMENT_PILL));

    expect(await findByText(/Buying via Transak/)).toBeOnTheScreen();

    fireEvent.press(await findByText('Change provider.'));

    expect(await findByText('Providers')).toBeOnTheScreen();
    expect(await findByText('MoonPay')).toBeOnTheScreen();

    fireEvent.press(await findByText('MoonPay'));

    expect(await findByText(/Buying via MoonPay/)).toBeOnTheScreen();
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
});
