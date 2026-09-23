import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { initialState } from '../../_mocks_/initialState';
import {
  MOCK_LIMIT_CANCELLED_ORDER,
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_FAILED_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { LimitOrderTabRow } from '.';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

function renderLimitOrderRow(order: LimitOrder) {
  return renderWithProvider(<LimitOrderTabRow order={order} />, {
    state: initialState,
  });
}

describe('LimitOrderRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an open order with its remaining time and staked amount', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_OPEN_ORDER);

    expect(
      getByText(
        strings('bridge.limit.pair', {
          source: MOCK_LIMIT_OPEN_ORDER.src.asset.symbol,
          dest: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
    expect(getByText('0.1 ETH')).toBeOnTheScreen();
    expect(
      getByText(
        strings('bridge.limit.limit_price', {
          symbol: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders a filled order with the amounts actually swapped', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_FILLED_ORDER);

    expect(getByText('+220 USDC')).toBeOnTheScreen();
    expect(getByText('-0.1 ETH')).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.filled'))).toBeOnTheScreen();
  });

  it('renders an expired order with the duration it stayed open', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_EXPIRED_ORDER);

    expect(
      getByText(strings('bridge.limit.expired_after', { duration: '3d' })),
    ).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.expired'))).toBeOnTheScreen();
  });

  it('renders a cancelled order with when it was cancelled', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_CANCELLED_ORDER);

    expect(
      getByText(strings('bridge.limit.canceled_at', { date: 'Sep 2' })),
    ).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.canceled'))).toBeOnTheScreen();
  });

  it('renders a failed order with when it failed', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_FAILED_ORDER);

    expect(
      getByText(strings('bridge.limit.failed_at', { date: 'Sep 1' })),
    ).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.failed'))).toBeOnTheScreen();
  });

  it('opens the order details sheet when an open order is pressed', () => {
    const { getByTestId } = renderLimitOrderRow(MOCK_LIMIT_OPEN_ORDER);

    fireEvent.press(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.OPEN_LIMIT_ORDER_DETAILS_MODAL,
    });
  });

  // The details sheet only offers cancellation, which no longer applies once
  // the order has left the open state.
  it('does not open the order details sheet for a filled order', () => {
    const { getByTestId } = renderLimitOrderRow(MOCK_LIMIT_FILLED_ORDER);

    fireEvent.press(getByTestId(OpenOrderRowSelectorsIDs.CONTAINER));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
