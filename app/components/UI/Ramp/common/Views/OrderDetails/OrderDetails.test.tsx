import React, { ComponentType } from 'react';
import * as indexModule from '../../../index';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import OrderDetails from './OrderDetails';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';
import { FiatOrder } from '../../../../../../reducers/fiatOrders';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import { RampSDK } from '../../sdk';
import {
  mockCryptoCurrenciesData,
  mockFiatCurrenciesData,
  mockPaymentMethods,
  mockRegionsData,
} from '../../../buy/Views/BuildQuote/BuildQuote.constants';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { Order } from '@consensys/on-ramp-sdk';
import { PROVIDER_LINKS } from '../../types';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockTrackEvent = jest.fn();
const mockDispatch = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  selectedPaymentMethodId: mockPaymentMethods[0].id,
  selectedRegion: mockRegionsData[0],
  selectedAsset: mockCryptoCurrenciesData[0],
  selectedFiatCurrencyId: mockFiatCurrenciesData[0].id,
  selectedChainId: '1',
  selectedNetworkName: 'Ethereum',
  sdkError: undefined,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../../common/sdk', () => ({
  ...jest.requireActual('../../../common/sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('../../../common/hooks/useAnalytics', () => () => mockTrackEvent);
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
      setOptions: mockSetNavigationOptions,
    }),
  };
});

let mockProcessFiatOrder: jest.Mock;
beforeEach(() => {
  mockProcessFiatOrder = jest
    .fn()
    .mockResolvedValue(() => Promise.resolve(testOrder));
  jest
    .spyOn(indexModule, 'processFiatOrder')
    .mockImplementation(mockProcessFiatOrder);
});

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const defaultOrder: DeepPartial<FiatOrder> = {
  id: 'test-order-1',
  account: '0x0',
  network: '1',
  cryptoAmount: '0.01231324',
  orderType: OrderOrderTypeEnum.Buy,
  state: FIAT_ORDER_STATES.COMPLETED,
  createdAt: 1697242033399,
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  cryptocurrency: 'ETH',
  amount: '34.23',
  currency: 'USD',
  sellTxHash: '0x123',
  data: {
    cryptoCurrency: {
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
    provider: {
      name: 'Test Provider',
    },
  },
};

let testOrder: DeepPartial<FiatOrder> = defaultOrder;

let mockOrderId = testOrder.id as string;
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    orderId: mockOrderId,
  })),
}));

beforeEach(() => {
  mockOrderId = testOrder.id as string;
});

function render(Component: React.ComponentType, orders = [testOrder]) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.BUILD_QUOTE,
    },
    {
      state: {
        engine: {
          backgroundState: initialBackgroundState,
        },
        fiatOrders: {
          orders: orders as FiatOrder[],
        },
      },
    },
  );
}

describe('OrderDetails', () => {
  it('renders an empty screen layout if there is no order', async () => {
    testOrder.id = 'invalid-id';
    render(OrderDetails);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls purchase details viewed analytics event on load if there is an order', async () => {
    render(OrderDetails, [testOrder]);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_PURCHASE_DETAILS_VIEWED',
      {
        purchase_status: testOrder.state,
        provider_onramp: (testOrder.data as Order)?.provider.name,
        payment_method_id: (testOrder.data as Order)?.paymentMethod?.id,
        currency_destination: testOrder.cryptocurrency,
        currency_source: testOrder.currency,
        chain_id_destination: testOrder.network,
        order_type: testOrder.orderType,
      },
    );
  });

  it('polls for a created order on load', async () => {
    testOrder.state = FIAT_ORDER_STATES.CREATED;

    render(OrderDetails, [testOrder]);

    expect(mockProcessFiatOrder).toHaveBeenCalledWith(
      testOrder,
      expect.any(Function),
      expect.any(Function),
      { forced: true },
    );

    // expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('renders a loading screen while the created order is fetched on load', async () => {
    mockProcessFiatOrder.mockImplementation(() => new Promise(() => {}));
    testOrder.state = FIAT_ORDER_STATES.CREATED;
    render(OrderDetails, [testOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders an error screen if a CREATED order cannot be polled on load', async () => {
    testOrder.state = FIAT_ORDER_STATES.CREATED;
    mockOrderId = testOrder.id as string;
    mockProcessFiatOrder.mockImplementationOnce(() => {
      throw new Error('An error occurred');
    });
    render(OrderDetails, [testOrder]);
    expect(screen.toJSON()).toMatchSnapshot();

    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(mockProcessFiatOrder).toHaveBeenCalledWith(
      testOrder,
      expect.any(Function),
      expect.any(Function),
      { forced: true },
    );
  });

  it('renders created orders', async () => {
    testOrder.state = FIAT_ORDER_STATES.CREATED;
    render(OrderDetails, [testOrder]);

    // should we expect particular text to be present?
    expect(screen.toJSON()).toMatchSnapshot();
  });
  it('renders a "continue" button for created, non-transacted sell orders', async () => {
    testOrder.orderType = OrderOrderTypeEnum.Sell;
    testOrder.state = FIAT_ORDER_STATES.CREATED;
    testOrder.sellTxHash = undefined;

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

  it('renders a completed order correctly with a "start new order" button', async () => {
    testOrder.state = FIAT_ORDER_STATES.COMPLETED;
    render(OrderDetails, [testOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(screen.getByText('Start a new order')).toBeTruthy();
  });

  it('renders the currency for non-pending orders, and handles the case where the currency is not available', async () => {
    testOrder.state = FIAT_ORDER_STATES.PENDING;
    render(OrderDetails, [testOrder]);
    expect(screen.getByText(`... ${testOrder.currency}`)).toBeTruthy();

    testOrder.state = FIAT_ORDER_STATES.COMPLETED;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    (testOrder.data as Order).fiatCurrency = undefined;
    render(OrderDetails, [testOrder]);
    expect(screen.getByText(`... ${testOrder.currency}`)).toBeTruthy();

    testOrder.currencySymbol = undefined;
    render(OrderDetails, [testOrder]);
    expect(screen.getByText(`... ${testOrder.currency}`)).toBeTruthy();

    testOrder = defaultOrder;
    render(OrderDetails, [testOrder]);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders the support links if the provider has them', async () => {
    (testOrder.data as DeepPartial<Order>).provider = {
      name: 'Test Provider',
      links: [
        {
          name: PROVIDER_LINKS.SUPPORT,
          url: 'https://example.com',
        },
      ],
    };
    render(OrderDetails, [testOrder]);

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('Navigates when the user attempts to make another purchase', async () => {
    testOrder.state = FIAT_ORDER_STATES.COMPLETED;
    render(OrderDetails, [testOrder]);
    expect(
      screen.getByRole('button', {
        name: 'Start a new order',
      }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Start a new order' }));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.BUY);
  });
});
