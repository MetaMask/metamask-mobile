import {
  CryptoCurrency,
  ProviderBuyFeatureBrowserEnum,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import { mockQuotesData } from '../Views/Quotes/Quotes.constants';

interface GetMockAggregatorQuotesResponseParams {
  amount: number | string;
  isBuy: boolean;
  selectedAsset?: CryptoCurrency | null;
  selectedFiatCurrencyId?: string | null;
  selectedAddress?: string | null;
  selectedPaymentMethodId?: string | null;
}

const MOCK_CHECKOUT_URL = 'https://example.com';
const MOCK_ORDER_ID = 'mock-dev-order-id';

function parseAmount(amount: number | string): number {
  if (typeof amount === 'number') {
    return amount;
  }

  const parsed = parseFloat(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createMockCheckoutAction() {
  return {
    browser: ProviderBuyFeatureBrowserEnum.AppBrowser,
    createWidget: (_callbackBaseUrl: string) =>
      Promise.resolve({
        url: MOCK_CHECKOUT_URL,
        orderId: MOCK_ORDER_ID,
      }),
  };
}

function attachMockCheckoutMethods(
  quote: QuoteResponse | SellQuoteResponse,
): QuoteResponse | SellQuoteResponse {
  const checkoutAction = () => Promise.resolve(createMockCheckoutAction());

  return {
    ...quote,
    buy: checkoutAction,
    sell: checkoutAction,
  } as QuoteResponse | SellQuoteResponse;
}

/**
 * Local dev mock for `getQuotes` / `getSellQuotes` SDK responses.
 * Quote CTA opens Checkout with a placeholder WebView URL.
 */
export function getMockAggregatorQuotesResponse({
  amount,
  isBuy: _isBuy,
  selectedAsset,
  selectedFiatCurrencyId,
  selectedAddress,
  selectedPaymentMethodId,
}: GetMockAggregatorQuotesResponseParams): {
  quotes: (QuoteResponse | SellQuoteResponse)[];
  sorted: [];
  customActions: [];
} {
  const numericAmount = parseAmount(amount) || 50;

  const quotes = mockQuotesData
    .filter((quote) => !quote.error)
    .map((quote) =>
      attachMockCheckoutMethods({
        ...quote,
        amountIn: numericAmount,
        receiver: selectedAddress ?? quote.receiver,
        paymentMethod: selectedPaymentMethodId ?? quote.paymentMethod,
        crypto: selectedAsset ?? quote.crypto,
        cryptoId: selectedAsset?.id ?? quote.cryptoId,
        fiatId: selectedFiatCurrencyId ?? quote.fiatId,
      } as QuoteResponse | SellQuoteResponse),
    );

  return {
    quotes,
    sorted: [],
    customActions: [],
  };
}
