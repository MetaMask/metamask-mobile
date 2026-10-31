import {
  REVOLUT_CALLBACK_RESPONSE,
  REVOLUT_INTERNAL_ORDER_CODE,
  REVOLUT_ORDER_ID,
  REVOLUT_PROVIDER_ORDER_ID,
  createRevolutOrderResponse,
  createRevolutQuoteResponse,
} from './ramps-revolut-response';

describe('createRevolutOrderResponse', () => {
  it('returns a provider order id that differs from the internal order code', () => {
    const order = createRevolutOrderResponse();

    expect(order.id).toBe(REVOLUT_ORDER_ID);
    expect(order.id.endsWith(`/orders/${REVOLUT_INTERNAL_ORDER_CODE}`)).toBe(
      true,
    );
    expect(order.providerOrderId).toBe(REVOLUT_PROVIDER_ORDER_ID);
    expect(order.providerOrderId).not.toBe(REVOLUT_INTERNAL_ORDER_CODE);
    expect(REVOLUT_CALLBACK_RESPONSE.id).toBe(order.id);
  });
});

describe('createRevolutQuoteResponse', () => {
  it('marks the Revolut quote as an external-browser checkout', () => {
    const [quote] = createRevolutQuoteResponse().success;

    expect(quote.provider).toBe('/providers/revolut');
    expect(quote.quote.buyWidget.browser).toBe('IN_APP_OS_BROWSER');
  });
});
