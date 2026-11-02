import '../../../../../../../tests/component-view/mocks';
import { act } from '@testing-library/react-native';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { renderAggregatorOrderDetailsView } from '../../../../../../../tests/component-view/renderers/ramps';
import {
  clearRampSdkApiMocks,
  mockRampAggregatorOrder,
  setupRampSdkApiMock,
} from '../../../../../../../tests/component-view/api-mocking/ramp';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import { AggregatorOrderDetailsSelectorsIDs } from './OrderDetails.testIds';

const ORDER_ID = '/providers/unlimitmeld/orders/o-1';
const WALLET = '0x1230000000000000000000000000000000000abc';
const PROVIDER_REMOVED_DESCRIPTION =
  'This provider is no longer available in MetaMask. Check the order status with the provider directly.';

const buildPendingOrder = (overrides: Partial<FiatOrder> = {}): FiatOrder =>
  ({
    id: ORDER_ID,
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: 1761868800000,
    amount: 100,
    fee: 5,
    cryptoAmount: 0.05,
    cryptoFee: 5,
    currency: 'USD',
    currencySymbol: '$',
    cryptocurrency: 'ETH',
    state: FIAT_ORDER_STATES.PENDING,
    account: WALLET,
    network: '1',
    excludeFromPurchases: false,
    orderType: OrderOrderTypeEnum.Buy,
    errorCount: 0,
    lastTimeFetched: 0,
    data: {
      id: ORDER_ID,
      providerOrderId: 'o-1',
      provider: { id: '/providers/unlimitmeld', name: 'Unlimit', links: [] },
      cryptoCurrency: { symbol: 'ETH', decimals: 18 },
      fiatCurrency: { symbol: 'USD', denomSymbol: '$', decimals: 2 },
      paymentMethod: { id: '/payments/debit-credit-card', name: 'Card' },
      statusDescription: '',
    },
    ...overrides,
  }) as FiatOrder;

const providerRemovedBody = {
  id: ORDER_ID,
  isOnlyLink: false,
  provider: { id: '/providers/unlimitmeld' },
  status: 'UNKNOWN',
  network: '',
  statusReason: 'PROVIDER_REMOVED',
  statusDescription: PROVIDER_REMOVED_DESCRIPTION,
  canBeUpdated: false,
  orderType: 'BUY',
};

describe('Aggregator OrderDetails — provider removed (TRAM-3417)', () => {
  beforeEach(() => {
    setupRampSdkApiMock();
  });

  afterEach(() => {
    clearRampSdkApiMocks();
  });

  it('shows the provider-removed status after a refresh gets a PROVIDER_REMOVED answer', async () => {
    const requests = mockRampAggregatorOrder(ORDER_ID, providerRemovedBody);
    const { findByTestId, getByTestId, queryByText } =
      renderAggregatorOrderDetailsView({
        orders: [buildPendingOrder()],
        orderId: ORDER_ID,
      });

    await act(async () => {
      await getByTestId(
        AggregatorOrderDetailsSelectorsIDs.SCROLL_VIEW,
      ).props.refreshControl.props.onRefresh();
    });

    expect(
      await findByTestId(
        AggregatorOrderDetailsSelectorsIDs.PROVIDER_REMOVED_TITLE,
      ),
    ).toHaveTextContent(
      strings('fiat_on_ramp_aggregator.order_details.provider_removed'),
    );
    expect(
      getByTestId(
        AggregatorOrderDetailsSelectorsIDs.PROVIDER_REMOVED_DESCRIPTION,
      ),
    ).toHaveTextContent(PROVIDER_REMOVED_DESCRIPTION);
    expect(
      queryByText(strings('fiat_on_ramp_aggregator.order_details.processing')),
    ).not.toBeOnTheScreen();
    expect(requests()).toBe(1);
  });

  it('keeps a provider-removed order final and does not fetch it on refresh', async () => {
    const requests = mockRampAggregatorOrder(ORDER_ID, providerRemovedBody);
    const { findByTestId, getByTestId } = renderAggregatorOrderDetailsView({
      orders: [
        buildPendingOrder({
          providerRemoved: true,
          statusDescription: PROVIDER_REMOVED_DESCRIPTION,
        }),
      ],
      orderId: ORDER_ID,
    });

    await act(async () => {
      await getByTestId(
        AggregatorOrderDetailsSelectorsIDs.SCROLL_VIEW,
      ).props.refreshControl.props.onRefresh();
    });

    expect(
      await findByTestId(
        AggregatorOrderDetailsSelectorsIDs.PROVIDER_REMOVED_DESCRIPTION,
      ),
    ).toHaveTextContent(PROVIDER_REMOVED_DESCRIPTION);
    expect(requests()).toBe(0);
  });
});
