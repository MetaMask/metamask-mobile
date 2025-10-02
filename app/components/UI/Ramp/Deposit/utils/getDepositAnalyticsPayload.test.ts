import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { DepositOrderType } from '@consensys/native-ramps-sdk';
import getDepositAnalyticsPayload from './getDepositAnalyticsPayload';

const mockState = {
  engine: {
    backgroundState,
  },
  fiatOrders: {
    selectedRegionDeposit: {
      isoCode: 'US',
      flag: '🇺🇸',
      name: 'United States',
      currency: 'USD',
      supported: true,
    },
  },
} as RootState;

describe('getDepositAnalyticsPayload', () => {
  const mockDepositOrder = {
    id: '123',
    provider: 'DEPOSIT',
    createdAt: Date.now(),
    account: '0x1234567890123456789012345678901234567890',
    excludeFromPurchases: false,
    orderType: DepositOrderType.Deposit,
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    network: 'eip155:1',
    data: {
      cryptoCurrency: 'USDC',
      network: 'ethereum',
      fiatAmount: '100',
      exchangeRate: '2000',
      totalFeesFiat: '2.50',
      networkFees: '1.25',
      partnerFees: '1.25',
      paymentMethod: 'credit_debit_card',
      fiatCurrency: 'USD',
    },
  };

  it('returns correct parameters for completed deposit order', () => {
    const [eventName, params] = getDepositAnalyticsPayload(
      mockDepositOrder as unknown as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1.25,
      processing_fee: 1.25,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
    });
  });

  it('returns correct parameters for failed deposit order', () => {
    const failedOrder = {
      ...mockDepositOrder,
      state: FIAT_ORDER_STATES.FAILED,
      data: {
        ...mockDepositOrder.data,
        statusDescription: 'Payment failed',
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      failedOrder as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_FAILED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1.25,
      processing_fee: 1.25,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
      error_message: 'Payment failed',
    });
  });

  it('returns correct parameters for failed deposit order with default error message', () => {
    const failedOrder = {
      ...mockDepositOrder,
      state: FIAT_ORDER_STATES.FAILED,
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      failedOrder as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_FAILED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1.25,
      processing_fee: 1.25,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
      error_message: 'transaction_failed',
    });
  });

  it('returns correct parameters with correct number conversions for all numeric fields', () => {
    const orderWithStringNumbers = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        fiatAmount: '250.75',
        exchangeRate: '1850.25',
        totalFeesFiat: '5.99',
        networkFees: '3.50',
        partnerFees: '2.49',
      },
      cryptoAmount: '0.135',
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithStringNumbers as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 250.75,
      amount_destination: 0.135,
      exchange_rate: 1850.25,
      gas_fee: 3.5,
      processing_fee: 2.49,
      total_fee: 5.99,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
    });
  });

  it('returns null for pending order state', () => {
    const pendingOrder = {
      ...mockDepositOrder,
      state: FIAT_ORDER_STATES.PENDING,
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      pendingOrder as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns null for created order state', () => {
    const createdOrder = {
      ...mockDepositOrder,
      state: FIAT_ORDER_STATES.CREATED,
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      createdOrder as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns null for cancelled order state', () => {
    const cancelledOrder = {
      ...mockDepositOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      cancelledOrder as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns null when order does not have cryptoCurrency field', () => {
    const orderWithoutCryptoCurrency = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        cryptoCurrency: undefined,
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithoutCryptoCurrency as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns null when cryptoCurrency mapping is not found', () => {
    const orderWithUnknownCrypto = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        cryptoCurrency: 'UNKNOWN_CRYPTO',
        network: 'unknown_network',
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithUnknownCrypto as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('handles missing networkFees with default 0 value', () => {
    const orderWithoutNetworkFees = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        networkFees: undefined,
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithoutNetworkFees as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 0,
      processing_fee: 1.25,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
    });
  });

  it('handles missing partnerFees with default 0 value', () => {
    const orderWithoutPartnerFees = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        partnerFees: undefined,
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithoutPartnerFees as unknown as FiatOrder,
      mockState,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1.25,
      processing_fee: 0,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: 'US',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
    });
  });

  it('handles missing selectedRegion with empty country string', () => {
    const stateWithoutRegion = {
      ...mockState,
      fiatOrders: {
        ...mockState.fiatOrders,
        selectedRegionDeposit: null,
      },
    } as RootState;

    const [eventName, params] = getDepositAnalyticsPayload(
      mockDepositOrder as unknown as FiatOrder,
      stateWithoutRegion,
    );

    expect(eventName).toBe('RAMPS_TRANSACTION_COMPLETED');
    expect(params).toEqual({
      ramp_type: 'DEPOSIT',
      amount_source: 100,
      amount_destination: 0.05,
      exchange_rate: 2000,
      gas_fee: 1.25,
      processing_fee: 1.25,
      total_fee: 2.5,
      payment_method_id: 'credit_debit_card',
      country: '',
      chain_id: 'eip155:1',
      currency_destination:
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      currency_source: 'USD',
    });
  });
});
