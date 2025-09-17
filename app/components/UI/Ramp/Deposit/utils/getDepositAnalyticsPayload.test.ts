import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { RootState } from '../../../../../reducers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import getDepositAnalyticsPayload from './getDepositAnalyticsPayload';
import {
  MOCK_ANALYTICS_DEPOSIT_ORDER,
  MOCK_USDC_TOKEN,
  MOCK_US_REGION,
} from '../testUtils/constants';

export const MOCK_ROOT_STATE = {
  engine: {
    backgroundState,
  },
  fiatOrders: {
    selectedRegionDeposit: MOCK_US_REGION,
  },
} as RootState;

describe('getDepositAnalyticsPayload', () => {
  const mockDepositOrder = MOCK_ANALYTICS_DEPOSIT_ORDER;

  it('returns correct parameters for completed deposit order', () => {
    const [eventName, params] = getDepositAnalyticsPayload(
      mockDepositOrder as unknown as FiatOrder,
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
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
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
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
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
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
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
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
      MOCK_ROOT_STATE,
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
      MOCK_ROOT_STATE,
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
      MOCK_ROOT_STATE,
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
      MOCK_ROOT_STATE,
    );

    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns null when cryptoCurrency mapping is not found', () => {
    const orderWithUnknownCrypto = {
      ...mockDepositOrder,
      data: {
        ...mockDepositOrder.data,
        cryptoCurrency: {
          assetId: 'unknown:asset',
          symbol: 'UNKNOWN_CRYPTO',
          name: 'Unknown Crypto',
          chainId: 'unknown:1',
          decimals: 18,
          iconUrl: 'https://example.com/unknown.png',
        },
        network: 'unknown_network',
      },
    };

    const [eventName, params] = getDepositAnalyticsPayload(
      orderWithUnknownCrypto as unknown as FiatOrder,
      MOCK_ROOT_STATE,
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
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
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
      MOCK_ROOT_STATE,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
      currency_source: 'USD',
    });
  });

  it('handles missing selectedRegion with empty country string', () => {
    const stateWithoutRegion = {
      ...MOCK_ROOT_STATE,
      fiatOrders: {
        ...MOCK_ROOT_STATE.fiatOrders,
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
      chain_id: 'ethereum',
      currency_destination: MOCK_USDC_TOKEN.assetId,
      currency_source: 'USD',
    });
  });
});
