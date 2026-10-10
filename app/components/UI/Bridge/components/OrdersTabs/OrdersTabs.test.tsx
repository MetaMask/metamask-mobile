import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import type { CaipChainId } from '@metamask/utils';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { setOrdersNetworkFilter } from '../../../../../core/redux/slices/bridge';
import { initialState } from '../../_mocks_/initialState';
import OrdersTabs from './OrdersTabs';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import {
  OrdersTabKey,
  type OrdersTabConfig,
  type OrdersTabsProps,
} from './OrdersTabs.types';

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

interface ChainOrder {
  id: string;
  chainId: CaipChainId;
}

const ETH_ORDER: ChainOrder = { id: 'eth-order', chainId: 'eip155:1' };
const ETH_ORDER_2: ChainOrder = { id: 'eth-order-2', chainId: 'eip155:1' };
const OPTIMISM_ORDER: ChainOrder = {
  id: 'optimism-order',
  chainId: 'eip155:10',
};

const getEthereumChainId = (): CaipChainId => ETH_ORDER.chainId;

function chainOrdersTab(items: ChainOrder[]): OrdersTabConfig<ChainOrder> {
  return {
    items,
    renderItem: (item) => <Text testID={`order-${item.id}`}>{item.id}</Text>,
    keyExtractor: (item) => item.id,
    getItemChainId: (item) => item.chainId,
  };
}

function stateWithOrdersNetworkFilter(
  ordersNetworkFilter: CaipChainId,
): DeepPartial<RootState> {
  return {
    ...initialState,
    bridge: { ...initialState.bridge, ordersNetworkFilter },
  };
}

function renderOrdersTabs<TOpen, THistory>(
  props: OrdersTabsProps<TOpen, THistory>,
  state: DeepPartial<RootState> = initialState,
) {
  return renderWithProvider(<OrdersTabs {...props} />, {
    state,
  });
}

describe('OrdersTabs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('shows open orders empty copy then history empty copy after pressing History', () => {
    const { getByTestId, getByText, queryByText } = renderOrdersTabs({
      openOrders: chainOrdersTab([]),
      history: chainOrdersTab([]),
    });

    expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.orders.empty.open_orders')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.open_orders'))).toBeNull();
  });

  describe('network filter visibility', () => {
    it('hides the network filter when there are no orders', () => {
      const { queryByTestId } = renderOrdersTabs({
        openOrders: chainOrdersTab([]),
        history: chainOrdersTab([]),
      });

      expect(
        queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeNull();
    });

    it('hides the network filter when every order is on the same network', () => {
      const { queryByTestId } = renderOrdersTabs({
        openOrders: chainOrdersTab([ETH_ORDER, ETH_ORDER_2]),
        history: chainOrdersTab([]),
      });

      expect(
        queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeNull();
    });

    it('opens the network picker with only the networks the orders are on', () => {
      const { getByTestId } = renderOrdersTabs({
        openOrders: chainOrdersTab([ETH_ORDER, OPTIMISM_ORDER]),
        history: chainOrdersTab([]),
      });

      const filterButton = getByTestId(
        OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON,
      );
      expect(filterButton).toHaveTextContent(strings('bridge.all_networks'));

      fireEvent.press(filterButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        params: {
          enabledChainIds: ['eip155:1', 'eip155:10'],
          filterTarget: 'orders',
        },
      });
    });

    it('shows the network filter once a fetched page adds a second network', () => {
      const { queryByTestId, getByTestId, rerender } = renderOrdersTabs({
        openOrders: chainOrdersTab([ETH_ORDER]),
        history: chainOrdersTab([]),
      });

      expect(
        queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeNull();

      rerender(
        <OrdersTabs
          openOrders={chainOrdersTab([ETH_ORDER, ETH_ORDER_2, OPTIMISM_ORDER])}
          history={chainOrdersTab([])}
        />,
      );
      fireEvent.press(
        getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        params: {
          enabledChainIds: ['eip155:1', 'eip155:10'],
          filterTarget: 'orders',
        },
      });
    });

    it('evaluates the network filter for the active tab only', () => {
      const { getByTestId, queryByTestId } = renderOrdersTabs({
        openOrders: chainOrdersTab([ETH_ORDER, OPTIMISM_ORDER]),
        history: chainOrdersTab([ETH_ORDER_2]),
      });

      expect(
        getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeOnTheScreen();

      fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

      expect(
        queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeNull();
    });

    it('ignores networks outside enabledChainIds', () => {
      const { queryByTestId } = renderOrdersTabs({
        enabledChainIds: ['eip155:1'],
        openOrders: chainOrdersTab([ETH_ORDER, OPTIMISM_ORDER]),
        history: chainOrdersTab([]),
      });

      expect(
        queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toBeNull();
    });

    it('keeps the network filter and its options after a network is selected', () => {
      const { getByTestId, store, rerender } = renderOrdersTabs({
        openOrders: chainOrdersTab([ETH_ORDER, OPTIMISM_ORDER]),
        history: chainOrdersTab([]),
      });

      act(() => {
        store.dispatch(setOrdersNetworkFilter(OPTIMISM_ORDER.chainId));
      });
      rerender(
        <OrdersTabs
          openOrders={chainOrdersTab([OPTIMISM_ORDER])}
          history={chainOrdersTab([])}
        />,
      );

      const filterButton = getByTestId(
        OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON,
      );
      expect(filterButton).toHaveTextContent('Optimism');

      fireEvent.press(filterButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        params: {
          enabledChainIds: ['eip155:1', 'eip155:10'],
          filterTarget: 'orders',
        },
      });
    });

    it('keeps the network filter while the All networks orders reload', () => {
      const { getByTestId, store, rerender } = renderOrdersTabs(
        {
          openOrders: chainOrdersTab([ETH_ORDER, OPTIMISM_ORDER]),
          history: chainOrdersTab([]),
        },
        stateWithOrdersNetworkFilter(OPTIMISM_ORDER.chainId),
      );

      act(() => {
        store.dispatch(setOrdersNetworkFilter(undefined));
      });
      rerender(
        <OrdersTabs
          openOrders={{ ...chainOrdersTab([]), isLoading: true }}
          history={chainOrdersTab([])}
        />,
      );

      expect(
        getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
      ).toHaveTextContent(strings('bridge.all_networks'));
    });
  });

  it('renders feature-specific open order and history items from distinct data shapes', () => {
    const { getByTestId, queryByTestId } = renderOrdersTabs({
      openOrders: {
        items: [{ id: 'limit-1', price: '2500' }],
        renderItem: (item) => (
          <Text testID="limit-open-order">{item.price}</Text>
        ),
        keyExtractor: (item) => item.id,
        getItemChainId: getEthereumChainId,
      },
      history: {
        items: [{ hash: '0xabc', executedAt: 1_700_000_000 }],
        renderItem: (item) => (
          <Text testID="recurring-history">{item.hash}</Text>
        ),
        keyExtractor: (item) => item.hash,
        getItemChainId: getEthereumChainId,
      },
    });

    expect(getByTestId('limit-open-order')).toHaveTextContent('2500');
    expect(queryByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeNull();
    expect(queryByTestId('recurring-history')).toBeNull();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(getByTestId('recurring-history')).toHaveTextContent('0xabc');
    expect(queryByTestId('limit-open-order')).toBeNull();
    expect(queryByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeNull();
  });

  it('hides open orders that are not on the selected network', () => {
    const { getByTestId, queryByTestId } = renderOrdersTabs(
      {
        openOrders: chainOrdersTab([ETH_ORDER]),
        history: chainOrdersTab([]),
      },
      stateWithOrdersNetworkFilter(OPTIMISM_ORDER.chainId),
    );

    expect(queryByTestId(`order-${ETH_ORDER.id}`)).toBeNull();
    expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
  });

  it('switches back to open orders when Open orders tab is pressed from History', () => {
    const { getByTestId, getByText, queryByText } = renderOrdersTabs({
      openOrders: chainOrdersTab([]),
      history: chainOrdersTab([]),
      initialTab: OrdersTabKey.History,
    });

    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.OPEN_ORDERS_TAB));

    expect(
      getByText(strings('bridge.orders.empty.open_orders')),
    ).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.history'))).toBeNull();
  });

  it('notifies the consumer when the selected tab changes', () => {
    const onTabChange = jest.fn();
    const { getByTestId } = renderOrdersTabs({
      openOrders: chainOrdersTab([]),
      history: chainOrdersTab([]),
      onTabChange,
    });

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(onTabChange).toHaveBeenCalledWith(OrdersTabKey.History);
  });

  it('renders the controlled active tab', () => {
    const { getByText, queryByText } = renderOrdersTabs({
      activeTab: OrdersTabKey.History,
      openOrders: chainOrdersTab([]),
      history: chainOrdersTab([]),
    });

    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.open_orders'))).toBeNull();
  });

  it('notifies controlled tab changes without changing rendered content', () => {
    const onTabChange = jest.fn();
    const { getByTestId, getByText, queryByText } = renderOrdersTabs({
      activeTab: OrdersTabKey.History,
      openOrders: chainOrdersTab([]),
      history: chainOrdersTab([]),
      onTabChange,
    });

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.OPEN_ORDERS_TAB));

    expect(onTabChange).toHaveBeenCalledWith(OrdersTabKey.OpenOrders);
    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.open_orders'))).toBeNull();
  });

  it('renders the initial loading state', () => {
    const { getByTestId } = renderOrdersTabs({
      openOrders: { ...chainOrdersTab([]), isLoading: true },
      history: chainOrdersTab([]),
    });

    expect(getByTestId(OrdersTabsSelectorsIDs.LOADING)).toBeOnTheScreen();
  });

  it('renders the next-page loading state below existing items', () => {
    const { getByTestId } = renderOrdersTabs({
      openOrders: {
        items: ['order-1'],
        renderItem: (item) => <Text>{item}</Text>,
        getItemChainId: getEthereumChainId,
        isFetchingNextPage: true,
      },
      history: chainOrdersTab([]),
    });

    expect(
      getByTestId(OrdersTabsSelectorsIDs.NEXT_PAGE_LOADING),
    ).toBeOnTheScreen();
  });

  it('retries after an initial error', () => {
    const onRetry = jest.fn();
    const { getByTestId } = renderOrdersTabs({
      openOrders: { ...chainOrdersTab([]), isError: true, onRetry },
      history: chainOrdersTab([]),
    });

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.RETRY_BUTTON));

    expect(getByTestId(OrdersTabsSelectorsIDs.ERROR_STATE)).toBeOnTheScreen();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders items without a keyExtractor using the row index as the key', () => {
    const { getByTestId } = renderOrdersTabs({
      openOrders: {
        items: [{ label: 'first' }, { label: 'second' }],
        renderItem: (item) => (
          <Text testID={`order-row-${item.label}`}>{item.label}</Text>
        ),
        getItemChainId: getEthereumChainId,
      },
      history: chainOrdersTab([]),
    });

    expect(getByTestId('order-row-first')).toHaveTextContent('first');
    expect(getByTestId('order-row-second')).toHaveTextContent('second');
    expect(getByTestId(OrdersTabsSelectorsIDs.CONTENT)).toBeOnTheScreen();
  });

  it('shows the selected network icon and name on the filter button', () => {
    const { getByTestId } = renderOrdersTabs(
      {
        openOrders: chainOrdersTab([]),
        history: chainOrdersTab([]),
      },
      stateWithOrdersNetworkFilter(OPTIMISM_ORDER.chainId),
    );

    expect(
      getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_AVATAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
    ).toHaveTextContent('Optimism');
  });
});
