import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { CaipChainId } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { initialState } from '../../_mocks_/initialState';
import OrdersTabs from './OrdersTabs';
import { OrdersTabsSelectorsIDs } from './OrdersTabs.testIds';
import type { OrdersTabsProps } from './OrdersTabs.types';

jest.mock('@shopify/flash-list', () =>
  require('../../../../../util/test/mockFlashList').flashListMock(),
);

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn().mockReturnValue(true),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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
    const { getByTestId, getByText, queryByText, queryByTestId } =
      renderOrdersTabs({
        openOrders: { items: [] },
        history: { items: [] },
      });

    expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.orders.empty.open_orders')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
    ).toHaveTextContent(strings('bridge.all_networks'));
    expect(
      queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_AVATAR),
    ).toBeNull();

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.HISTORY_TAB));

    expect(getByText(strings('bridge.orders.empty.history'))).toBeOnTheScreen();
    expect(queryByText(strings('bridge.orders.empty.open_orders'))).toBeNull();
    expect(
      queryByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
    ).toBeNull();
  });

  it('opens the swaps network picker when the All networks filter is pressed', () => {
    const { getByTestId } = renderOrdersTabs({
      openOrders: { items: [] },
      history: { items: [] },
    });

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
      params: { enabledChainIds: undefined },
    });
  });

  it('opens the network picker restricted to enabledChainIds', () => {
    const enabledChainIds: CaipChainId[] = ['eip155:1', 'eip155:8453'];

    const { getByTestId } = renderOrdersTabs({
      enabledChainIds,
      openOrders: { items: [] },
      history: { items: [] },
    });

    fireEvent.press(getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
      params: { enabledChainIds },
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
      },
      history: {
        items: [{ hash: '0xabc', executedAt: 1_700_000_000 }],
        renderItem: (item) => (
          <Text testID="recurring-history">{item.hash}</Text>
        ),
        keyExtractor: (item) => item.hash,
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
        openOrders: {
          items: [{ id: 'eth-order', chainId: '0x1' as const }],
          renderItem: (item) => (
            <Text testID="limit-open-order">{item.id}</Text>
          ),
          keyExtractor: (item) => item.id,
          getItemChainId: (item) => item.chainId,
        },
        history: { items: [] },
      },
      {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          tokenSelectorNetworkFilter: formatChainIdToCaip('0xa'),
        },
      },
    );

    expect(queryByTestId('limit-open-order')).toBeNull();
    expect(getByTestId(OrdersTabsSelectorsIDs.EMPTY_STATE)).toBeOnTheScreen();
  });

  it('shows the selected network icon and name on the filter button', () => {
    const { getByTestId } = renderOrdersTabs(
      {
        openOrders: { items: [] },
        history: { items: [] },
      },
      {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          tokenSelectorNetworkFilter: formatChainIdToCaip('0xa'),
        },
      },
    );

    expect(
      getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_AVATAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(OrdersTabsSelectorsIDs.NETWORK_FILTER_BUTTON),
    ).toHaveTextContent('Optimism');
  });
});
