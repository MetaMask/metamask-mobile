import React from 'react';
import { processFiatOrder } from '../../../index';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../../util/test/renderWithProvider';
import OrderDetails from './OrderDetails';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';

import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import Routes from '../../../../../../constants/navigation/Routes';
import { RampSDK } from '../../sdk';
import { PROVIDER_LINKS } from '../../types';
import AppConstants from '../../../../../../core/AppConstants';
import {
  MOCK_ADDRESS_1,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockTrackEvent = jest.fn();
const mockDispatch = jest.fn();
const mockGoToAggregator = jest.fn();
const mockGoToSell = jest.fn();

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);
jest.mock('../../../hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({
    goToAggregator: mockGoToAggregator,
    goToSell: mockGoToSell,
  })),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

const mockOrder: DeepPartial<FiatOrder> = {
  id: 'test-order-1',
  account: MOCK_ADDRESS_1,
  network: '1',
  cryptoAmount: '0.01231324',
  orderType: OrderOrderTypeEnum.Buy,
  state: FIAT_ORDER_STATES.PENDING,
  createdAt: 1697242033399,
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  cryptocurrency: 'ETH',
  amount: '34.23',
  currency: 'USD',
  sellTxHash: '0x123',
  lastTimeFetched: 0,
  data: {
    cryptoCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      network: { shortName: 'ETH' },
    },
    provider: {
      name: 'Test Provider',
    },
    paymentMethod: {
      id: 'test-payment-method-id',
    },
  },
};

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedPaymentMethodId: 'test-payment-method-id',
  selectedRegion: {
    currencies: ['/currencies/fiat/clp'],
    emoji: '🇨🇱',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
  },
  selectedAsset: { symbol: 'TEST' },
  selectedFiatCurrencyId: '/test/fiat-currency',
};

const mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

const mockUseParamsDefaultValues = {
  orderId: mockOrder.id,
  redirectToSendTransaction: false,
};

let mockUseParamsValues = {
  ...mockUseParamsDefaultValues,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParamsValues,
}));

function mockGetUpdatedOrder(order: FiatOrder) {
  return {
    ...order,
    lastTimeFetched: (order.lastTimeFetched || 0) + 100,
  };
}

jest.mock('../../../index', () => ({
  processFiatOrder: jest.fn().mockImplementation((order, onSuccess) => {
    const updatedOrder = mockGetUpdatedOrder(order);
    if (onSuccess) {
      onSuccess(updatedOrder);
    }
    Promise.resolve();
  }),
}));

function render(Component: React.ComponentType, orders = [mockOrder]) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.BUILD_QUOTE,
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
        fiatOrders: {
          orders: orders as FiatOrder[],
        },
      },
    },
  );
}

describe('OrderDetails', () => {
  beforeEach(() => {
    mockUseParamsValues = {
      ...mockUseParamsDefaultValues,
    };
  });

  afterEach(() => {
    mockTrackEvent.mockClear();
    (processFiatOrder as jest.Mock).mockClear();
  });

  it('calls setOptions when rendering', async () => {
    render(OrderDetails);
    expect(mockSetNavigationOptions).toHaveBeenCalled();
  });

  it('renders an empty screen layout if there is no order', async () => {
    mockUseParamsValues = {
      ...mockUseParamsDefaultValues,
      orderId: 'invalid-id',
    };
    render(OrderDetails);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders header with back navigation capability on empty order state', async () => {
    mockUseParamsValues = {
      ...mockUseParamsDefaultValues,
      orderId: 'invalid-id',
    };
    render(OrderDetails);

    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByText('Order details')).toBeTruthy();
  });

  it('redirects to send transaction page when user is redirected back from a provider for a sell order', async () => {
    const testOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CREATED,
      orderType: OrderOrderTypeEnum.Sell,
      sellTxHash: undefined,
    };
    mockUseParamsValues = {
      ...mockUseParamsDefaultValues,
      redirectToSendTransaction: true,
    };
    render(OrderDetails, [testOrder]);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SEND_TRANSACTION, {
      orderId: testOrder.id,
    });
  });

  it('renders a pending order', async () => {
    render(OrderDetails);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders a completed order', async () => {
    const completedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      data: {
        ...mockOrder.data,
        statusDescription: 'Your ETH is now available in your account',
      },
    };
    render(OrderDetails, [completedOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders a cancelled order', async () => {
    const cancelledOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
      data: {
        ...mockOrder.data,
        statusDescription:
          'Something went wrong, and Test Provider was unable to complete your order. Please try again or with another provider.',
      },
    };
    render(OrderDetails, [cancelledOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders a failed order', async () => {
    const failedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
      data: {
        ...mockOrder.data,
        statusDescription:
          'Something went wrong, and Test Provider was unable to complete your order. Please try again or with another provider.',
      },
    };
    render(OrderDetails, [failedOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('sends analytics events when an order is loaded', () => {
    render(OrderDetails);
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_PURCHASE_DETAILS_VIEWED",
        {
          "chain_id_destination": "1",
          "currency_destination": "ETH",
          "currency_destination_network": "ETH",
          "currency_destination_symbol": "ETH",
          "currency_source": "USD",
          "order_type": "BUY",
          "payment_method_id": "test-payment-method-id",
          "provider_onramp": "Test Provider",
          "status": "PENDING",
        },
      ]
    `);

    mockTrackEvent.mockReset();
    const testOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
    };

    render(OrderDetails, [testOrder]);
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_PURCHASE_DETAILS_VIEWED",
        {
          "chain_id_source": "1",
          "currency_destination": "USD",
          "currency_source": "ETH",
          "currency_source_network": "ETH",
          "currency_source_symbol": "ETH",
          "order_type": "SELL",
          "payment_method_id": "test-payment-method-id",
          "provider_offramp": "Test Provider",
          "status": "PENDING",
        },
      ]
    `);
  });

  it('navigates to buy flow when the user attempts to make another purchase', async () => {
    const testOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
    };

    render(OrderDetails, [testOrder]);
    expect(
      screen.getByRole('button', {
        name: 'Start a new order',
      }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start a new order' }));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockGoToAggregator).toHaveBeenCalledWith();
  });

  it('navigates to sell flow when the user attempts to make another purchase', async () => {
    const testOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.COMPLETED,
    };

    render(OrderDetails, [testOrder]);
    expect(
      screen.getByRole('button', {
        name: 'Start a new order',
      }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start a new order' }));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockGoToSell).toHaveBeenCalledWith();
  });

  it('renders a created order', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
    };
    await waitFor(() => render(OrderDetails, [createdOrder]));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders transacted orders that do not have timeDescriptionPending', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
      sellTxHash: '0x123',
    };
    await waitFor(() => render(OrderDetails, [createdOrder]));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders transacted orders that have timeDescriptionPending', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
      sellTxHash: '0x123',
      data: {
        ...mockOrder.data,
        timeDescriptionPending: 'test-time-description',
      },
    };
    await waitFor(() => render(OrderDetails, [createdOrder]));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('polls transacted orders', async () => {
    jest.useFakeTimers();
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
      sellTxHash: '0x123',
    };

    const intervalCount = 3;

    await waitFor(() => render(OrderDetails, [createdOrder]));
    act(() => {
      jest.advanceTimersByTime(
        AppConstants.FIAT_ORDERS.POLLING_FREQUENCY * intervalCount,
      );
      jest.clearAllTimers();
      jest.useFakeTimers({ legacyFakeTimers: true });
    });
    // processFiatOrder is called on load and then 3 times by the interval
    expect(processFiatOrder).toHaveBeenCalledTimes(1 + intervalCount);
  });

  it('renders non-transacted orders', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
      sellTxHash: undefined,
      data: {
        ...mockOrder.data,
        statusDescription:
          "To continue your order, you'll need to select the button at the bottom of this page.",
      },
    };
    await waitFor(() => render(OrderDetails, [createdOrder]));
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('polls for a created order on load and dispatches an action to update', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
    };

    await waitFor(() => render(OrderDetails, [createdOrder]));

    expect(processFiatOrder).toHaveBeenCalledWith(
      createdOrder,
      expect.any(Function),
      expect.any(Function),
      { forced: true },
    );

    const updatedOrder = mockGetUpdatedOrder(createdOrder as FiatOrder);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'FIAT_UPDATE_ORDER',
      payload: updatedOrder,
    });
  });

  it('renders an error screen if a CREATED order cannot be polled on load', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
    };
    (processFiatOrder as jest.Mock).mockImplementationOnce(() => {
      throw new Error('An error occurred');
    });
    await waitFor(() => render(OrderDetails, [createdOrder]));
    expect(screen.toJSON()).toMatchSnapshot();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    });

    expect(processFiatOrder).toHaveBeenCalledWith(
      createdOrder,
      expect.any(Function),
      expect.any(Function),
      { forced: true },
    );
  });

  it('renders header with back navigation capability on error state', async () => {
    const createdOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
      state: FIAT_ORDER_STATES.CREATED,
    };
    (processFiatOrder as jest.Mock).mockImplementationOnce(() => {
      throw new Error('An error occurred');
    });
    await waitFor(() => render(OrderDetails, [createdOrder]));

    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByText('Order details')).toBeTruthy();
  });

  it('renders the support links if the provider has them', async () => {
    const testOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      data: {
        ...mockOrder.data,
        statusDescription: 'Your ETH is now available in your account',
        provider: {
          name: 'Test Provider',
          links: [
            {
              name: PROVIDER_LINKS.SUPPORT,
              url: 'https://example.com',
            },
          ],
        },
        providerOrderLink: 'https://example.com',
      },
    };
    render(OrderDetails, [testOrder as FiatOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('tracks external link clicks', () => {
    const testOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      data: {
        ...mockOrder.data,
        provider: {
          name: 'Test Provider',
          links: [
            {
              name: PROVIDER_LINKS.SUPPORT,
              url: 'https://example.com',
            },
          ],
        },
        providerOrderLink: 'https://example.com',
      },
    };

    render(OrderDetails, [testOrder as FiatOrder]);

    fireEvent.press(screen.getByText('Contact support'));
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_EXTERNAL_LINK_CLICKED',
      {
        location: 'Order Details Screen',
        text: 'Etherscan Transaction',
        url_domain: 'https://example.com',
      },
    );

    fireEvent.press(screen.getByText('View order status on Test Provider'));
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_EXTERNAL_LINK_CLICKED',
      {
        location: 'Order Details Screen',
        text: 'Provider Order Tracking',
        url_domain: 'https://example.com',
      },
    );
  });

  it('renders a "continue" button for created, non-transacted sell orders', async () => {
    const testOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CREATED,
      orderType: OrderOrderTypeEnum.Sell,
      sellTxHash: undefined,
    };

    render(OrderDetails, [testOrder]);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Continue this order' }),
      ).toBeTruthy();
    });

    fireEvent.press(
      screen.getByRole('button', { name: 'Continue this order' }),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.SEND_TRANSACTION, {
      orderId: testOrder.id,
    });
  });
});
