import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../constants/on-ramp';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import getRampsV2AnalyticsPayload from './getRampsV2AnalyticsPayload';

describe('getRampsV2AnalyticsPayload', () => {
  const mockBuyOrder = {
    id: '/providers/transak/orders/123',
    state: FIAT_ORDER_STATES.FAILED,
    orderType: 'BUY',
    provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
    amount: 100,
    currency: 'USD',
    cryptocurrency: 'ETH',
    network: '1',
    fee: '1',
    cryptoAmount: '0.01',
    data: {
      paymentMethod: {
        id: '/payments/debit-credit-card',
      },
      provider: {
        id: '/providers/transak',
        name: 'Transak',
      },
      region: 'US',
      network: { name: 'Ethereum', chainId: 'eip155:1' },
      cryptoCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
      fiatCurrency: { symbol: 'USD' },
      networkFees: 0.5,
      partnerFees: 0.5,
      statusDescription: 'card_declined',
    },
  };

  const mockSellOrder = {
    ...mockBuyOrder,
    orderType: 'SELL',
  };

  it('returns correct parameters for failed buy order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload(
      mockBuyOrder as FiatOrder,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_FAILED');
    expect(params).toEqual({
      ramp_type: 'UNIFIED_BUY_2',
      amount_source: 100,
      amount_destination: 0.01,
      exchange_rate: 9900,
      payment_method_id: '/payments/debit-credit-card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination: 'eip155:1/slip44:60',
      currency_destination_symbol: 'ETH',
      currency_destination_network: 'Ethereum',
      currency_source: 'USD',
      provider_onramp: 'Transak',
      gas_fee: 0.5,
      processing_fee: 0.5,
      total_fee: 1,
      error_message: 'card_declined',
    });
  });

  it('returns correct parameters for cancelled buy order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    } as FiatOrder);

    expect(eventName).toBe('ONRAMP_PURCHASE_CANCELLED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'USD',
      currency_destination: 'ETH',
      order_type: 'BUY',
      payment_method_id: '/payments/debit-credit-card',
      chain_id_destination: '1',
      provider_onramp: 'Transak',
    });
  });

  it('returns correct parameters for completed buy order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
    } as FiatOrder);

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'UNIFIED_BUY_2',
      amount_source: 100,
      amount_destination: 0.01,
      exchange_rate: 9900,
      payment_method_id: '/payments/debit-credit-card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination: 'eip155:1/slip44:60',
      currency_destination_symbol: 'ETH',
      currency_destination_network: 'Ethereum',
      currency_source: 'USD',
      provider_onramp: 'Transak',
      gas_fee: 0.5,
      processing_fee: 0.5,
      total_fee: 1,
    });
  });

  it('returns null for pending buy order state', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.PENDING,
    } as FiatOrder);

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns correct parameters for failed sell order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload(
      mockSellOrder as FiatOrder,
    );

    expect(eventName).toBe('OFFRAMP_PURCHASE_FAILED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: 'SELL',
      payment_method_id: '/payments/debit-credit-card',
      chain_id_source: '1',
      provider_offramp: 'Transak',
    });
  });

  it('returns correct parameters for cancelled sell order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    } as FiatOrder);

    expect(eventName).toBe('OFFRAMP_PURCHASE_CANCELLED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: 'SELL',
      payment_method_id: '/payments/debit-credit-card',
      chain_id_source: '1',
      provider_offramp: 'Transak',
    });
  });

  it('returns correct parameters for completed sell order', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      fee: '1',
      cryptoAmount: '0.01',
      data: {
        ...mockSellOrder.data,
        fiatAmountInUsd: 99,
      },
    } as FiatOrder);

    expect(eventName).toBe('OFFRAMP_PURCHASE_COMPLETED');
    expect(params).toEqual({
      amount: 100,
      amount_in_usd: 99,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: 'SELL',
      payment_method_id: '/payments/debit-credit-card',
      chain_id_source: '1',
      exchange_rate: 9900,
      fiat_out: 100,
      provider_offramp: 'Transak',
      total_fee: 1,
    });
  });

  it('returns null for pending sell order state', () => {
    const [eventName, params] = getRampsV2AnalyticsPayload({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.PENDING,
    } as FiatOrder);

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  // The V2 unified API returns orderType: 'DEPOSIT' for native flows
  // (e.g. Transak + Apple Pay). DEPOSIT must map to the on-ramp events,
  // not the off-ramp events. See TRAM-3534.
  describe('DEPOSIT orders (Transak native on-ramp)', () => {
    const mockDepositOrder = {
      ...mockBuyOrder,
      orderType: 'DEPOSIT',
    };

    it('returns RAMPS_TRANSACTION_FAILED for DEPOSIT orders', () => {
      const [eventName, params] = getRampsV2AnalyticsPayload(
        mockDepositOrder as FiatOrder,
      );

      expect(eventName).toBe('RAMPS_TRANSACTION_FAILED');
      expect(params).toEqual({
        ramp_type: 'UNIFIED_BUY_2',
        amount_source: 100,
        amount_destination: 0.01,
        exchange_rate: 9900,
        payment_method_id: '/payments/debit-credit-card',
        country: 'US',
        chain_id: 'eip155:1',
        currency_destination: 'eip155:1/slip44:60',
        currency_destination_symbol: 'ETH',
        currency_destination_network: 'Ethereum',
        currency_source: 'USD',
        provider_onramp: 'Transak',
        gas_fee: 0.5,
        processing_fee: 0.5,
        total_fee: 1,
        error_message: 'card_declined',
      });
    });

    it('returns ONRAMP_PURCHASE_CANCELLED for DEPOSIT orders', () => {
      const [eventName, params] = getRampsV2AnalyticsPayload({
        ...mockDepositOrder,
        state: FIAT_ORDER_STATES.CANCELLED,
      } as FiatOrder);

      expect(eventName).toBe('ONRAMP_PURCHASE_CANCELLED');
      expect(params).toEqual({
        amount: 100,
        currency_source: 'USD',
        currency_destination: 'ETH',
        order_type: 'DEPOSIT',
        payment_method_id: '/payments/debit-credit-card',
        chain_id_destination: '1',
        provider_onramp: 'Transak',
      });
    });

    it('returns RAMPS_TRANSACTION_COMPLETED for DEPOSIT orders', () => {
      const [eventName, params] = getRampsV2AnalyticsPayload({
        ...mockDepositOrder,
        state: FIAT_ORDER_STATES.COMPLETED,
      } as FiatOrder);

      expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
      expect(params).toEqual({
        ramp_type: 'UNIFIED_BUY_2',
        amount_source: 100,
        amount_destination: 0.01,
        exchange_rate: 9900,
        payment_method_id: '/payments/debit-credit-card',
        country: 'US',
        chain_id: 'eip155:1',
        currency_destination: 'eip155:1/slip44:60',
        currency_destination_symbol: 'ETH',
        currency_destination_network: 'Ethereum',
        currency_source: 'USD',
        provider_onramp: 'Transak',
        gas_fee: 0.5,
        processing_fee: 0.5,
        total_fee: 1,
      });
    });
  });

  it('handles missing optional data fields gracefully', () => {
    const orderWithNoData = {
      ...mockBuyOrder,
      data: {},
    };

    const [eventName, params] = getRampsV2AnalyticsPayload(
      orderWithNoData as FiatOrder,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_FAILED');
    expect(params).toEqual({
      ramp_type: 'UNIFIED_BUY_2',
      amount_source: 100,
      amount_destination: 0.01,
      exchange_rate: 9900,
      payment_method_id: '',
      country: '',
      chain_id: '1',
      currency_destination: '',
      currency_source: 'USD',
      provider_onramp: '',
      gas_fee: 0,
      processing_fee: 0,
      total_fee: 1,
      error_message: 'transaction_failed',
    });
  });

  it('handles missing optional data fields gracefully for SELL orders (legacy off-ramp params)', () => {
    const sellOrderWithNoData = {
      ...mockSellOrder,
      data: {},
    };

    const [eventName, params] = getRampsV2AnalyticsPayload(
      sellOrderWithNoData as FiatOrder,
    );

    expect(eventName).toBe('OFFRAMP_PURCHASE_FAILED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: 'SELL',
      payment_method_id: '',
      chain_id_source: '1',
      provider_offramp: '',
    });
  });

  it('falls back to empty string for chain_id and currency_source when both data and fiatOrder fields are missing', () => {
    const orderMissingAll = {
      ...mockBuyOrder,
      network: undefined,
      currency: undefined,
      data: {},
    };

    const [, params] = getRampsV2AnalyticsPayload(
      orderMissingAll as unknown as FiatOrder,
    );

    expect(params).toEqual(
      expect.objectContaining({
        chain_id: '',
        currency_source: '',
      }),
    );
  });

  it('uses data.exchangeRate verbatim when present instead of the computed fallback', () => {
    const orderWithExchangeRate = {
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      data: {
        ...mockBuyOrder.data,
        exchangeRate: 5000,
      },
    };

    const [, params] = getRampsV2AnalyticsPayload(
      orderWithExchangeRate as FiatOrder,
    );

    expect(params).toEqual(
      expect.objectContaining({
        exchange_rate: 5000,
      }),
    );
  });

  it('falls back to 0 for computed exchange_rate when cryptoAmount is 0', () => {
    const orderZeroCrypto = {
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      cryptoAmount: '0',
      data: {
        ...mockBuyOrder.data,
        exchangeRate: undefined,
      },
    };

    const [, params] = getRampsV2AnalyticsPayload(
      orderZeroCrypto as unknown as FiatOrder,
    );

    expect(params).toEqual(
      expect.objectContaining({
        exchange_rate: 0,
      }),
    );
  });
});
