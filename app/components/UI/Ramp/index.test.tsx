import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import FiatOrders from '.';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../constants/on-ramp';
import { FiatOrder } from '../../../reducers/fiatOrders';
import WebView from '@metamask/react-native-webview';
import getAggregatorAnalyticsPayload from './Aggregator/utils/getAggregatorAnalyticsPayload';

const mockNavigate = jest.fn();

jest.mock('./hooks/useHydrateRampsController', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock WebView component
jest.mock('@metamask/react-native-webview', () => () => null);

const defaultState = {
  engine: {
    backgroundState,
  },
  fiatOrders: {
    orders: [],
    customOrderIds: [],
    authenticationUrls: [],
  },
};

describe('FiatOrders', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly with no orders', () => {
    renderWithProvider(<FiatOrders />, {
      state: defaultState,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with authentication URLs', () => {
    const stateWithUrls = {
      ...defaultState,
      fiatOrders: {
        ...defaultState.fiatOrders,
        authenticationUrls: [
          'https://test.metamask.io/auth',
          'https://test.metamask.io/auth2',
        ],
      },
    };

    renderWithProvider(<FiatOrders />, {
      state: stateWithUrls,
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('removes authentication URL after successful navigation', () => {
    const mockUrl = 'https://test.metamask.io/auth';
    const stateWithUrl = {
      ...defaultState,
      fiatOrders: {
        ...defaultState.fiatOrders,
        authenticationUrls: [mockUrl],
      },
    };

    renderWithProvider(<FiatOrders />, {
      state: stateWithUrl,
    });

    // Simulate WebView navigation completion
    const webView = screen.UNSAFE_getByType(WebView);
    webView.props.onNavigationStateChange({
      url: 'https://metamask.io/callback',
      loading: false,
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });
});

describe('getAggregatorAnalyticsPayload', () => {
  const mockBuyOrder = {
    id: '123',
    state: FIAT_ORDER_STATES.FAILED,
    orderType: OrderOrderTypeEnum.Buy,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    amount: 100,
    currency: 'USD',
    cryptocurrency: 'ETH',
    network: '1',
    data: {
      paymentMethod: {
        id: 'card',
      },
      provider: {
        name: 'test-provider',
      },
    },
  };

  const mockSellOrder = {
    ...mockBuyOrder,
    orderType: OrderOrderTypeEnum.Sell,
  };

  it('returns correct parameters for failed buy order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload(
      mockBuyOrder as FiatOrder,
    );

    expect(eventName).toBe('ONRAMP_PURCHASE_FAILED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'USD',
      currency_destination: 'ETH',
      order_type: OrderOrderTypeEnum.Buy,
      payment_method_id: 'card',
      chain_id_destination: '1',
      provider_onramp: 'test-provider',
    });
  });

  it('returns correct parameters for cancelled buy order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    } as FiatOrder);

    expect(eventName).toBe('ONRAMP_PURCHASE_CANCELLED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'USD',
      currency_destination: 'ETH',
      order_type: OrderOrderTypeEnum.Buy,
      payment_method_id: 'card',
      chain_id_destination: '1',
      provider_onramp: 'test-provider',
    });
  });

  it('returns correct parameters for completed buy order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
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
      order_type: OrderOrderTypeEnum.Buy,
      payment_method_id: 'card',
      chain_id_destination: '1',
      exchange_rate: 9900,
      provider_onramp: 'test-provider',
      total_fee: 1,
    });
  });

  it('returns null for pending buy order state', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
      ...mockBuyOrder,
      state: FIAT_ORDER_STATES.PENDING,
    } as FiatOrder);
    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });

  it('returns correct parameters for failed sell order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload(
      mockSellOrder as FiatOrder,
    );

    expect(eventName).toBe('OFFRAMP_PURCHASE_FAILED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: OrderOrderTypeEnum.Sell,
      payment_method_id: 'card',
      chain_id_source: '1',
      provider_offramp: 'test-provider',
    });
  });

  it('returns correct parameters for cancelled sell order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    } as FiatOrder);

    expect(eventName).toBe('OFFRAMP_PURCHASE_CANCELLED');
    expect(params).toEqual({
      amount: 100,
      currency_source: 'ETH',
      currency_destination: 'USD',
      order_type: OrderOrderTypeEnum.Sell,
      payment_method_id: 'card',
      chain_id_source: '1',
      provider_offramp: 'test-provider',
    });
  });

  it('returns correct parameters for completed sell order', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
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
      order_type: OrderOrderTypeEnum.Sell,
      payment_method_id: 'card',
      chain_id_source: '1',
      exchange_rate: 9900,
      fiat_out: 100,
      provider_offramp: 'test-provider',
      total_fee: 1,
    });
  });

  it('returns null for pending sell order state', () => {
    const [eventName, params] = getAggregatorAnalyticsPayload({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.PENDING,
    } as FiatOrder);
    expect(eventName).toBeNull();
    expect(params).toBeNull();
  });
});
