import { buildHeadlessOrderFailedProps } from './headlessOrderFailedProps';

const BASE_ARGS = {
  rampSurface: 'perps' as const,
  amountSource: 100,
  amountDestination: 0.05,
  paymentMethodId: '/payments/debit-credit-card',
  region: 'de',
  chainId: 'eip155:42161',
  currencyDestination: 'eip155:42161/slip44:60',
  currencySource: 'EUR',
  errorMessage: 'order lookup failed',
};

describe('buildHeadlessOrderFailedProps', () => {
  it('builds the full payload with the optional fields when provided', () => {
    expect(
      buildHeadlessOrderFailedProps({
        ...BASE_ARGS,
        providerOrderId: 'order-guid-1',
        currencyDestinationSymbol: 'ETH',
      }),
    ).toStrictEqual({
      ramp_type: 'HEADLESS',
      ramp_surface: 'perps',
      provider_order_id: 'order-guid-1',
      amount_source: 100,
      amount_destination: 0.05,
      payment_method_id: '/payments/debit-credit-card',
      region: 'de',
      chain_id: 'eip155:42161',
      currency_destination: 'eip155:42161/slip44:60',
      currency_destination_symbol: 'ETH',
      currency_source: 'EUR',
      error_message: 'order lookup failed',
      is_authenticated: true,
    });
  });

  it('omits the optional keys entirely when absent (no undefined-valued keys)', () => {
    const props = buildHeadlessOrderFailedProps(BASE_ARGS);
    expect(props).not.toHaveProperty('provider_order_id');
    expect(props).not.toHaveProperty('currency_destination_symbol');
    expect(props.ramp_type).toBe('HEADLESS');
    expect(props.is_authenticated).toBe(true);
  });
});
