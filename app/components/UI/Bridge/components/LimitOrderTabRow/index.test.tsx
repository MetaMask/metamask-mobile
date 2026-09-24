import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { initialState } from '../../_mocks_/initialState';
import {
  MOCK_LIMIT_CANCELLED_ORDER,
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_FAILED_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_OPEN_ORDER,
} from '../../api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import { LimitOrderTabRow } from '.';

function renderLimitOrderRow(order: LimitOrder) {
  return renderWithProvider(<LimitOrderTabRow order={order} />, {
    state: initialState,
  });
}

// Row press and the details sheet it opens are covered in
// LimitOrderTabRow.view.test.tsx, which drives real navigation.
describe('LimitOrderRow', () => {
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
});
