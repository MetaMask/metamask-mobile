import { createBuyOrderResponse } from './ramps-buy-order-status-response';
import { RAMPS_PROVIDERS_RESPONSE } from './ramps-providers-response';
import { createRampsQuoteResponse } from './ramps-quotes-response';

export const REVOLUT_PROVIDER_ID = '/providers/revolut';
export const REVOLUT_PROVIDER_NAME = 'Revolut';
export const REVOLUT_PROVIDER_ORDER_ID = 'REV-1';
export const REVOLUT_INTERNAL_ORDER_CODE = 'ABC';
export const REVOLUT_ORDER_ID = `/providers/revolut/orders/${REVOLUT_INTERNAL_ORDER_CODE}`;
export const REVOLUT_CRYPTO_AMOUNT = '0.05123';
export const REVOLUT_RETURN_DEEPLINK = `metamask://on-ramp/providers/revolut?orderId=${REVOLUT_PROVIDER_ORDER_ID}`;

const aggregatorProvider = RAMPS_PROVIDERS_RESPONSE.providers[1];

export const REVOLUT_PROVIDERS_RESPONSE = {
  providers: [
    {
      ...aggregatorProvider,
      id: REVOLUT_PROVIDER_ID,
      name: REVOLUT_PROVIDER_NAME,
    },
  ],
};

export const createRevolutQuoteResponse = () => {
  const base = createRampsQuoteResponse('aggregator');
  const [quote] = base.success;

  return {
    ...base,
    success: [
      {
        ...quote,
        provider: REVOLUT_PROVIDER_ID,
        quote: {
          ...quote.quote,
          buyURL: 'https://on-ramp.api.cx.metamask.io/v2/providers/revolut/buy',
          buyWidget: { browser: 'IN_APP_OS_BROWSER' as const },
        },
        providerInfo: {
          ...quote.providerInfo,
          id: REVOLUT_PROVIDER_ID,
          name: REVOLUT_PROVIDER_NAME,
        },
      },
    ],
    sorted: [
      { sortBy: '2', ids: [REVOLUT_PROVIDER_ID] },
      { sortBy: '1', ids: [REVOLUT_PROVIDER_ID] },
    ],
  };
};

export const REVOLUT_CALLBACK_RESPONSE = {
  id: REVOLUT_ORDER_ID,
};

export const createRevolutOrderResponse = () => ({
  ...createBuyOrderResponse('COMPLETED'),
  id: REVOLUT_ORDER_ID,
  providerOrderId: REVOLUT_PROVIDER_ORDER_ID,
  cryptoAmount: REVOLUT_CRYPTO_AMOUNT,
  providerOrderLink: 'https://revolut.example/orders/REV-1',
  provider: {
    id: REVOLUT_PROVIDER_ID,
    name: REVOLUT_PROVIDER_NAME,
  },
});
