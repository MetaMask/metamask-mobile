import '../../../../../../../tests/component-view/mocks';
import React from 'react';
import { Text, View } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import {
  CryptoCurrency,
  FiatCurrency,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';

// eslint-disable-next-line import-x/no-namespace
import * as LoadingAnimationModule from '../../components/LoadingAnimation';
import { renderAggregatorQuotesView } from '../../../../../../../tests/component-view/renderers/ramps';
import { RampType } from '../../types';

interface LoadingAnimationProps {
  title: string;
  finish: boolean;
  onAnimationEnd?: () => void;
}

/**
 * The Aggregator Quotes screen renders a `LoadingAnimation` while
 * `isLoading && !firstFetchCompleted` is true. The real animation drives
 * `onAnimationEnd` from a long-running animation timer; this test stub
 * fires it synchronously when `finish={true}` so the screen exits the
 * loading state as soon as the SDK quote promise resolves.
 */
function MockLoadingAnimation({
  title,
  finish,
  onAnimationEnd,
}: LoadingAnimationProps) {
  React.useEffect(() => {
    if (finish && onAnimationEnd) {
      onAnimationEnd();
    }
  }, [finish, onAnimationEnd]);
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
}

beforeEach(() => {
  jest
    .spyOn(LoadingAnimationModule, 'default')
    .mockImplementation(MockLoadingAnimation);
});

const ETH = {
  id: '/currencies/crypto/1/eth',
  idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
  network: {
    active: true,
    chainId: '1',
    chainName: 'Ethereum Mainnet',
    shortName: 'Ethereum',
  },
  logo: 'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
  decimals: 18,
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
} as unknown as CryptoCurrency;

const EUR = {
  id: '/currencies/fiat/eur',
  symbol: 'EUR',
  name: 'Euro',
  denomSymbol: '€',
  decimals: 2,
} as unknown as FiatCurrency;

const FRANCE_REGION_ID = '/regions/fr';
const PAYMENT_METHOD_ID = '/payments/sepa-bank-transfer';
const WALLET_ADDRESS = '0xabc123abc123abc123abc123abc123abc123abcd';

/**
 * Minimal QuoteResponse shape consumed by `Quote` (provider name,
 * amounts, fee, exchange rate). Avoids pulling the heavyweight
 * `mockQuotesData` constant whose ordering depends on `sorted`/sort tags
 * we don't supply.
 */
function buildSellQuote(
  overrides: Partial<SellQuoteResponse> = {},
): SellQuoteResponse {
  return {
    provider: {
      id: '/providers/moonpay-staging',
      name: 'MoonPay (Staging)',
      description: '',
      hqAddress: '',
      links: [],
      logos: { light: '', dark: '', height: 24, width: 88 },
      features: {} as never,
    },
    crypto: ETH,
    fiat: EUR,
    amountIn: 50,
    amountOut: 38.42,
    networkFee: 0.5,
    providerFee: 1.2,
    extraFee: 0,
    exchangeRate: 0.7684,
    error: false,
    paymentMethod: 'sepa-bank-transfer',
    receiver: WALLET_ADDRESS,
    isNativeApplePay: false,
    amountOutInFiat: 38.42,
    tags: { isBestRate: true, isMostReliable: true },
    ...overrides,
  } as unknown as SellQuoteResponse;
}

function buildBuyQuote(overrides: Partial<QuoteResponse> = {}): QuoteResponse {
  return {
    provider: {
      id: '/providers/transak-staging',
      name: 'Transak (Staging)',
      description: '',
      hqAddress: '',
      links: [],
      logos: { light: '', dark: '', height: 24, width: 90 },
      features: {} as never,
    },
    crypto: ETH,
    fiat: EUR,
    amountIn: 50,
    amountOut: 0.0162,
    networkFee: 2.64,
    providerFee: 1.84,
    extraFee: 0,
    exchangeRate: 2854.39,
    error: false,
    paymentMethod: 'sepa-bank-transfer',
    receiver: WALLET_ADDRESS,
    isNativeApplePay: false,
    amountOutInFiat: 44.39,
    tags: { isBestRate: true, isMostReliable: true },
    ...overrides,
  } as unknown as QuoteResponse;
}

describe('Aggregator Quotes screen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads sell quotes via getSellQuotes and renders the recommended provider', async () => {
    const sellQuote = buildSellQuote();
    const getSellQuotes = jest.fn().mockResolvedValue({
      quotes: [sellQuote],
      sorted: [],
      customActions: [],
    });

    const { render, sdkMocks } = renderAggregatorQuotesView({
      rampType: RampType.SELL,
      amount: 50,
      selectedAsset: ETH,
      selectedFiatCurrency: EUR,
      selectedPaymentMethodId: PAYMENT_METHOD_ID,
      selectedAddress: WALLET_ADDRESS,
      sdkMocks: { getSellQuotes },
    });

    expect(await render.findByText('MoonPay (Staging)')).toBeOnTheScreen();

    await waitFor(() => {
      expect(sdkMocks.getSellQuotes).toHaveBeenCalledWith(
        FRANCE_REGION_ID,
        [PAYMENT_METHOD_ID],
        ETH.id,
        EUR.id,
        50,
        WALLET_ADDRESS,
        expect.anything(),
      );
    });
  });

  it('loads buy quotes via getQuotes and renders the recommended provider', async () => {
    const buyQuote = buildBuyQuote();
    const getQuotes = jest.fn().mockResolvedValue({
      quotes: [buyQuote],
      sorted: [],
      customActions: [],
    });

    const { render, sdkMocks } = renderAggregatorQuotesView({
      rampType: RampType.BUY,
      amount: 50,
      selectedAsset: ETH,
      selectedFiatCurrency: EUR,
      selectedPaymentMethodId: PAYMENT_METHOD_ID,
      selectedAddress: WALLET_ADDRESS,
      sdkMocks: { getQuotes },
    });

    expect(await render.findByText('Transak (Staging)')).toBeOnTheScreen();

    await waitFor(() => {
      expect(sdkMocks.getQuotes).toHaveBeenCalledWith(
        FRANCE_REGION_ID,
        [PAYMENT_METHOD_ID],
        ETH.id,
        EUR.id,
        50,
        WALLET_ADDRESS,
        expect.anything(),
      );
    });
  });

  it('renders the no-quotes error view when getSellQuotes returns no quotes', async () => {
    const getSellQuotes = jest.fn().mockResolvedValue({
      quotes: [],
      sorted: [],
      customActions: [],
    });

    const { render } = renderAggregatorQuotesView({
      rampType: RampType.SELL,
      amount: 50,
      selectedAsset: ETH,
      selectedFiatCurrency: EUR,
      selectedPaymentMethodId: PAYMENT_METHOD_ID,
      selectedAddress: WALLET_ADDRESS,
      sdkMocks: { getSellQuotes },
    });

    expect(await render.findByText('No providers available')).toBeOnTheScreen();
  });
});
