import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import OrderDetails from './OrderDetails';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import { FiatOrder, V2FiatOrderData } from '../../../../../reducers/fiatOrders';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';

const mockTrackEvent = jest.fn();

jest.mock('../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../Bridge/hooks/useLegacySwapsBlockExplorer', () => ({
  useLegacySwapsBlockExplorer: () => ({
    tx: (hash: string) => `https://etherscan.io/tx/${hash}`,
    isValid: true,
    name: 'Etherscan',
  }),
}));

jest.mock('../../../../../util/number', () => ({
  renderFiat: (amount: number) => `${amount.toFixed(2)}`,
  renderFromTokenMinimalUnit: (amount: string) => amount,
  toTokenMinimalUnit: (amount: number) => amount,
}));

jest.mock('../utils', () => ({
  getOrderAmount: (order: FiatOrder) => order.cryptoAmount?.toString() || '0',
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../reducers/fiatOrders'),
  getProviderName: (provider: string, data: unknown) =>
    (data as { provider?: { name: string } })?.provider?.name || provider,
}));

const mockOrder: FiatOrder = {
  id: 'order-123',
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: 1609459200000,
  amount: 100,
  fee: 5,
  cryptoAmount: 0.05,
  cryptoFee: 5,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'ETH',
  state: FIAT_ORDER_STATES.PENDING,
  account: '0xabcdef1234567890',
  network: '1',
  txHash: '0xtxhash',
  orderType: OrderOrderTypeEnum.Buy,
  excludeFromPurchases: false,
  data: {
    provider: {
      id: '/providers/transak',
      name: 'Transak',
      links: [{ name: 'support', url: 'https://support.transak.com' }],
    },
    fiatCurrency: {
      id: 'USD',
      symbol: 'USD',
      decimals: 2,
      denomSymbol: '$',
    },
    cryptoCurrency: {
      id: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    providerOrderId: 'provider-order-123',
    providerOrderLink: 'https://transak.com/order/123',
    paymentMethod: {
      id: '/payments/card',
      name: 'Credit Card',
    },
    exchangeRate: 2000,
    totalFeesFiat: 5,
    fiatAmount: 100,
    cryptoAmount: 0.05,
  } as V2FiatOrderData,
};

function renderWithProvider(component: React.ReactElement) {
  return renderScreen(
    () => component,
    {
      name: 'OrderDetails',
    },
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              ...backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1',
                  name: 'Ethereum Mainnet',
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                  rpcEndpoints: [],
                  blockExplorerUrls: ['https://etherscan.io'],
                },
              },
            },
          },
        },
      },
    },
  );
}

describe('OrderDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order in pending state', () => {
    const { toJSON, getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.processing'),
    ).toBeOnTheScreen();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders order in completed state', () => {
    const completedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={completedOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.successful'),
    ).toBeOnTheScreen();
  });

  it('renders order in failed state', () => {
    const failedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={failedOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.failed'),
    ).toBeOnTheScreen();
  });

  it('renders order in cancelled state', () => {
    const cancelledOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={cancelledOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.cancelled'),
    ).toBeOnTheScreen();
  });

  it('renders order in created state', () => {
    const createdOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CREATED,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={createdOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.pending'),
    ).toBeOnTheScreen();
  });

  it('renders statusDescription when available', () => {
    const orderWithDescription = {
      ...mockOrder,
      data: {
        ...mockOrder.data,
        statusDescription: 'Processing payment',
      },
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={orderWithDescription} />,
    );
    expect(getByText('Processing payment')).toBeOnTheScreen();
  });

  it('renders timeDescriptionPending for transacted created orders', () => {
    const orderWithTime = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.CREATED,
      sellTxHash: '0xselltxhash',
      data: {
        ...mockOrder.data,
        timeDescriptionPending: 'Should arrive in 5 minutes',
      },
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={orderWithTime} />,
    );
    expect(getByText('Should arrive in 5 minutes')).toBeOnTheScreen();
  });

  it('renders provider order link when available', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.view_order_status'),
    ).toBeOnTheScreen();
  });

  it('tracks analytics when provider order link is pressed', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );

    const link = getByText(
      'fiat_on_ramp_aggregator.order_details.view_order_status',
    );
    fireEvent.press(link);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_EXTERNAL_LINK_CLICKED',
      {
        location: 'Order Details Screen',
        text: 'Provider Order Tracking',
        url_domain: 'https://transak.com/order/123',
      },
    );
  });

  it('renders support link when available', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.contact_support'),
    ).toBeOnTheScreen();
  });

  it('tracks analytics when support link is pressed', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );

    const link = getByText(
      'fiat_on_ramp_aggregator.order_details.contact_support',
    );
    fireEvent.press(link);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_EXTERNAL_LINK_CLICKED',
      {
        location: 'Order Details Screen',
        text: 'Etherscan Transaction',
        url_domain: 'https://support.transak.com',
      },
    );
  });

  it('renders blockchain explorer link for completed orders with txHash', () => {
    const completedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      txHash: '0xtxhash',
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={completedOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.etherscan'),
    ).toBeOnTheScreen();
  });

  it('tracks analytics when blockchain explorer link is pressed', () => {
    const completedOrder = {
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
      txHash: '0xtxhash',
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={completedOrder} />,
    );

    const link = getByText('fiat_on_ramp_aggregator.order_details.etherscan');
    fireEvent.press(link);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'ONRAMP_EXTERNAL_LINK_CLICKED',
      {
        location: 'Order Details Screen',
        text: 'Etherscan Transaction',
        url_domain: 'https://etherscan.io/tx/0xtxhash',
      },
    );
  });

  it('does not render blockchain explorer link for pending orders', () => {
    const { queryByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      queryByText('fiat_on_ramp_aggregator.order_details.etherscan'),
    ).toBeNull();
  });

  it('renders payment method for buy orders', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.payment_method'),
    ).toBeOnTheScreen();
    expect(getByText('Credit Card')).toBeOnTheScreen();
  });

  it('renders destination for sell orders', () => {
    const sellOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={sellOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.destination'),
    ).toBeOnTheScreen();
  });

  it('renders order ID', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.id'),
    ).toBeOnTheScreen();
    expect(getByText('provider-order-123')).toBeOnTheScreen();
  });

  it('renders date and time', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.date_and_time'),
    ).toBeOnTheScreen();
  });

  it('renders token amount for buy orders', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.token_amount'),
    ).toBeOnTheScreen();
  });

  it('renders token quantity sold for sell orders', () => {
    const sellOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={sellOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.token_quantity_sold'),
    ).toBeOnTheScreen();
  });

  it('renders exchange rate', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.exchange_rate'),
    ).toBeOnTheScreen();
  });

  it('renders total fees', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.total_fees'),
    ).toBeOnTheScreen();
  });

  it('renders purchase amount for buy orders', () => {
    const { getByText } = renderWithProvider(
      <OrderDetails order={mockOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.purchase_amount'),
    ).toBeOnTheScreen();
  });

  it('renders amount received for sell orders', () => {
    const sellOrder = {
      ...mockOrder,
      orderType: OrderOrderTypeEnum.Sell,
    };

    const { getByText } = renderWithProvider(
      <OrderDetails order={sellOrder} />,
    );
    expect(
      getByText('fiat_on_ramp_aggregator.order_details.amount_received_total'),
    ).toBeOnTheScreen();
  });

  it('renders loading state when fiatCurrency decimals are undefined', () => {
    const orderWithoutDecimals: FiatOrder = {
      ...mockOrder,
      data: {
        ...(mockOrder.data as V2FiatOrderData),
        fiatCurrency: {
          id: 'USD',
          symbol: 'USD',
          decimals: undefined as unknown as number,
          denomSymbol: '',
        },
      } as V2FiatOrderData,
    };

    const { getAllByText } = renderWithProvider(
      <OrderDetails order={orderWithoutDecimals} />,
    );
    expect(getAllByText('...').length).toBeGreaterThan(0);
  });

  it('renders loading state when cryptoCurrency decimals are undefined', () => {
    const orderWithoutDecimals: FiatOrder = {
      ...mockOrder,
      data: {
        ...(mockOrder.data as V2FiatOrderData),
        cryptoCurrency: {
          id: 'ETH',
          symbol: 'ETH',
          decimals: undefined as unknown as number,
        },
      } as V2FiatOrderData,
    };

    const { getAllByText } = renderWithProvider(
      <OrderDetails order={orderWithoutDecimals} />,
    );
    expect(getAllByText('...').length).toBeGreaterThan(0);
  });

  it('calculates exchange rate from order data when not provided', () => {
    const orderWithoutRate = {
      ...mockOrder,
      data: {
        ...mockOrder.data,
        exchangeRate: undefined,
      },
    };

    const { toJSON } = renderWithProvider(
      <OrderDetails order={orderWithoutRate} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders without provider order link when not available', () => {
    const orderWithoutLink: FiatOrder = {
      ...mockOrder,
      data: {
        ...(mockOrder.data as V2FiatOrderData),
        providerOrderLink: undefined,
      } as V2FiatOrderData,
    };

    const { queryByText } = renderWithProvider(
      <OrderDetails order={orderWithoutLink} />,
    );
    expect(
      queryByText('fiat_on_ramp_aggregator.order_details.view_order_status'),
    ).toBeNull();
  });

  it('renders without support link when not available', () => {
    const orderWithoutSupport: FiatOrder = {
      ...mockOrder,
      data: {
        ...(mockOrder.data as V2FiatOrderData),
        provider: {
          id: '/providers/transak',
          name: 'Transak',
          links: [],
        },
      } as V2FiatOrderData,
    };

    const { queryByText } = renderWithProvider(
      <OrderDetails order={orderWithoutSupport} />,
    );
    expect(
      queryByText('fiat_on_ramp_aggregator.order_details.contact_support'),
    ).toBeNull();
  });

  it('renders without date when createdAt is not available', () => {
    const orderWithoutDate: FiatOrder = {
      ...mockOrder,
      createdAt: 0,
    };

    const { queryByText } = renderWithProvider(
      <OrderDetails order={orderWithoutDate} />,
    );
    expect(
      queryByText('fiat_on_ramp_aggregator.order_details.date_and_time'),
    ).toBeNull();
  });

  it('does not render payment method when not available', () => {
    const orderWithoutPaymentMethod: FiatOrder = {
      ...mockOrder,
      data: {
        ...(mockOrder.data as V2FiatOrderData),
        paymentMethod: undefined,
      } as V2FiatOrderData,
    };

    const { queryByText } = renderWithProvider(
      <OrderDetails order={orderWithoutPaymentMethod} />,
    );
    expect(
      queryByText('fiat_on_ramp_aggregator.order_details.payment_method'),
    ).toBeNull();
  });

  it('matches snapshot with minimal data', () => {
    const minimalOrder: FiatOrder = {
      id: 'order-456',
      provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
      createdAt: 1609459200000,
      amount: 50,
      fee: 2,
      cryptoAmount: 0.025,
      cryptoFee: 2,
      currency: 'EUR',
      currencySymbol: '€',
      cryptocurrency: 'USDC',
      state: FIAT_ORDER_STATES.PENDING,
      account: '0x1234567890',
      network: '1',
      orderType: OrderOrderTypeEnum.Buy,
      excludeFromPurchases: false,
      data: {} as V2FiatOrderData,
    };

    const { toJSON } = renderWithProvider(
      <OrderDetails order={minimalOrder} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
