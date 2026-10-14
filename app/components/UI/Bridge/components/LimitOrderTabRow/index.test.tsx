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
import { formatLimitOrderFiatValue } from '../../utils/limitOrders/formatLimitOrderFiatValue';
import { LimitOrderTabRow } from '.';

function renderLimitOrderRow(order: LimitOrder) {
  return renderWithProvider(<LimitOrderTabRow order={order} />, {
    state: initialState,
  });
}

// Row press and the details sheet it opens are covered in
// LimitOrderTabRow.view.test.tsx, which drives real navigation.
describe('LimitOrderRow', () => {
  it('renders an open order with the limit price it was placed at', () => {
    const { getByText, queryByText } = renderLimitOrderRow(
      MOCK_LIMIT_OPEN_ORDER,
    );

    expect(
      getByText(
        strings('bridge.limit.pair', {
          source: MOCK_LIMIT_OPEN_ORDER.src.asset.symbol,
          dest: MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
        }),
      ),
    ).toBeOnTheScreen();
    // Selling ETH for USDC at 2200 USDC per ETH.
    expect(getByText('2200 USDC')).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.limit.limit_price', { symbol: 'ETH' })),
    ).toBeOnTheScreen();
    expect(queryByText('0.10 ETH')).not.toBeOnTheScreen();
  });

  it('renders the limit price of a buy against the token being bought', () => {
    const buyOrder: LimitOrder = {
      ...MOCK_LIMIT_OPEN_ORDER,
      src: {
        asset: {
          assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          chainId: 1,
          symbol: 'USDT',
          decimals: 6,
        },
        amount: '2000190',
      },
      dest: {
        asset: {
          assetId: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          chainId: 1,
          symbol: 'LINK',
          decimals: 18,
        },
        amount: '175980000000000000',
        minAmount: '175980000000000000',
      },
      trigger: { kind: 'ratio', threshold: 'below', price: '11.36567' },
    };

    const { getByText, queryByText } = renderLimitOrderRow(buyOrder);

    expect(getByText('11.36567 USDT')).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.limit.limit_price', { symbol: 'LINK' })),
    ).toBeOnTheScreen();
    expect(queryByText('2.00 USDT')).not.toBeOnTheScreen();
  });

  it('renders a USD limit price for an order placed in fiat', () => {
    const fiatBuyOrder: LimitOrder = {
      ...MOCK_LIMIT_OPEN_ORDER,
      src: {
        asset: {
          assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
          address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          chainId: 1,
          symbol: 'USDT',
          decimals: 6,
        },
        amount: '2001300',
      },
      dest: {
        asset: {
          assetId: 'eip155:1/erc20:0x514910771af9ca656af840dff83e8264ecf986ca',
          address: '0x514910771af9ca656af840dff83e8264ecf986ca',
          chainId: 1,
          symbol: 'LINK',
          decimals: 18,
        },
        amount: '175980000000000000',
        minAmount: '175980000000000000',
      },
      trigger: { kind: 'dest_price', threshold: 'below', price: '11.382233' },
    };

    const { getByText, queryByText } = renderLimitOrderRow(fiatBuyOrder);

    expect(
      getByText(formatLimitOrderFiatValue('11.382233', 'usd')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.limit.limit_price', { symbol: 'LINK' })),
    ).toBeOnTheScreen();
    expect(queryByText('2.0013 USDT')).not.toBeOnTheScreen();
  });

  it('renders a filled order with the amounts actually swapped', () => {
    const { getByText } = renderLimitOrderRow(MOCK_LIMIT_FILLED_ORDER);

    expect(getByText('+220.00 USDC')).toBeOnTheScreen();
    expect(getByText('-0.10 ETH')).toBeOnTheScreen();
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
