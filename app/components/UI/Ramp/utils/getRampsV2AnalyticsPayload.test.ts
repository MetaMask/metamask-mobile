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
    data: {
      paymentMethod: {
        id: '/payments/debit-credit-card',
      },
      provider: {
        id: '/providers/transak',
        name: 'Transak',
      },
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

    expect(eventName).toBe('ONRAMP_PURCHASE_FAILED');
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
      fee: '1',
      cryptoAmount: '0.01',
      data: {
        ...mockBuyOrder.data,
        fiatAmountInUsd: 99,
      },
    } as FiatOrder);

    expect(eventName).toBe('ONRAMP_PURCHASE_COMPLETED');
    expect(params).toEqual({
      amount: 100,
      amount_in_usd: 99,
      crypto_out: '0.01',
      currency_source: 'USD',
      currency_destination: 'ETH',
      order_type: 'BUY',
      payment_method_id: '/payments/debit-credit-card',
      chain_id_destination: '1',
      exchange_rate: 9900,
      provider_onramp: 'Transak',
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

  it('handles missing optional data fields gracefully', () => {
    const orderWithNoData = {
      ...mockBuyOrder,
      data: {},
    };

    const [eventName, params] = getRampsV2AnalyticsPayload(
      orderWithNoData as FiatOrder,
    );

    expect(eventName).toBe('ONRAMP_PURCHASE_FAILED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'USD',
      currency_destination: 'ETH',
      order_type: 'BUY',
      payment_method_id: '',
      chain_id_destination: '1',
      provider_onramp: '',
    });
  });
});
