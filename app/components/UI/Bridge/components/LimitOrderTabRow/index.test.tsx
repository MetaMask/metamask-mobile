import React from 'react';
import { lightTheme } from '@metamask/design-tokens';
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
import { OpenOrderRowSelectorsIDs } from '../OpenOrderRow/OpenOrderRow.testIds';
import { LimitOrderTabRow } from '.';

function renderLimitOrderRow(order: LimitOrder) {
  return renderWithProvider(<LimitOrderTabRow order={order} />, {
    state: initialState,
  });
}

// Row press and the details sheet it opens are covered in
// LimitOrderTabRow.view.test.tsx, which drives real navigation.
describe('LimitOrderRow', () => {
  it.each([
    {
      state: 'open',
      order: MOCK_LIMIT_OPEN_ORDER,
      titleColor: lightTheme.colors.text.default,
      primaryColor: lightTheme.colors.text.default,
    },
    {
      state: 'filled',
      order: MOCK_LIMIT_FILLED_ORDER,
      titleColor: lightTheme.colors.text.default,
      primaryColor: lightTheme.colors.success.default,
    },
    {
      state: 'expired',
      order: MOCK_LIMIT_EXPIRED_ORDER,
      titleColor: lightTheme.colors.text.alternative,
      primaryColor: lightTheme.colors.text.alternative,
    },
    {
      state: 'cancelled',
      order: MOCK_LIMIT_CANCELLED_ORDER,
      titleColor: lightTheme.colors.text.alternative,
      primaryColor: lightTheme.colors.text.alternative,
    },
    {
      state: 'failed',
      order: MOCK_LIMIT_FAILED_ORDER,
      titleColor: lightTheme.colors.error.default,
      primaryColor: lightTheme.colors.text.alternative,
    },
  ])(
    'colors the pair and value of a $state order by its state',
    ({ order, titleColor, primaryColor }) => {
      const { getByTestId } = renderLimitOrderRow(order);

      expect(getByTestId(OpenOrderRowSelectorsIDs.TITLE)).toHaveStyle({
        color: titleColor,
      });
      expect(getByTestId(OpenOrderRowSelectorsIDs.PRIMARY)).toHaveStyle({
        color: primaryColor,
      });
    },
  );

  it('renders no title accessory on a history order', () => {
    const { queryByTestId } = renderLimitOrderRow(MOCK_LIMIT_FAILED_ORDER);

    expect(
      queryByTestId(OpenOrderRowSelectorsIDs.TITLE_END_ACCESSORY),
    ).not.toBeOnTheScreen();
  });

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

  it('renders the limit price of a sell as entered when the API reports it inverted', () => {
    // Selling BNB at 817.501762 USDT per BNB, which the API reports as
    // 1 / 817.501762 BNB per USDT.
    const sellOrder: LimitOrder = {
      ...MOCK_LIMIT_OPEN_ORDER,
      src: {
        asset: {
          assetId: 'eip155:56/slip44:714',
          address: '0x0000000000000000000000000000000000000000',
          chainId: 56,
          symbol: 'BNB',
          decimals: 18,
        },
        amount: '100000000000000000',
      },
      dest: {
        asset: {
          assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
          address: '0x55d398326f99059ff775485246999027b3197955',
          chainId: 56,
          symbol: 'USDT',
          decimals: 18,
        },
        amount: '81750176200000000000',
        minAmount: '81750176200000000000',
      },
      trigger: {
        kind: 'ratio',
        threshold: 'above',
        price: '0.00122323895370393098',
      },
    };

    const { getByText, queryByText } = renderLimitOrderRow(sellOrder);

    expect(getByText('817.501762 USDT')).toBeOnTheScreen();
    expect(
      getByText(strings('bridge.limit.limit_price', { symbol: 'BNB' })),
    ).toBeOnTheScreen();
    expect(queryByText('0.00122323 BNB')).not.toBeOnTheScreen();
  });

  it.each([
    ['2500', '250000000000000000000', '0.0004'],
    ['12.5', '1250000000000000000', '0.08'],
    ['1.25', '125000000000000000', '0.8'],
  ])(
    'renders a sell limit price of %s exactly when the API reports its exact reciprocal',
    (limitPrice, destAmount, ratio) => {
      const sellOrder: LimitOrder = {
        ...MOCK_LIMIT_OPEN_ORDER,
        src: {
          asset: {
            assetId: 'eip155:56/slip44:714',
            address: '0x0000000000000000000000000000000000000000',
            chainId: 56,
            symbol: 'BNB',
            decimals: 18,
          },
          amount: '100000000000000000',
        },
        dest: {
          asset: {
            assetId:
              'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
            address: '0x55d398326f99059ff775485246999027b3197955',
            chainId: 56,
            symbol: 'USDT',
            decimals: 18,
          },
          amount: destAmount,
          minAmount: destAmount,
        },
        trigger: { kind: 'ratio', threshold: 'above', price: ratio },
      };

      const { getByText } = renderLimitOrderRow(sellOrder);

      expect(getByText(`${limitPrice} USDT`)).toBeOnTheScreen();
    },
  );

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

  it('renders a filled order with the amounts actually swapped and no status tag', () => {
    const { getByText, queryByText } = renderLimitOrderRow(
      MOCK_LIMIT_FILLED_ORDER,
    );

    expect(getByText('+220.00 USDC')).toBeOnTheScreen();
    expect(getByText('-0.10 ETH')).toBeOnTheScreen();
    expect(queryByText(strings('bridge.limit.filled'))).not.toBeOnTheScreen();
  });

  it('renders an expired order with the duration it stayed open and no status tag', () => {
    const { getByText, queryByText } = renderLimitOrderRow(
      MOCK_LIMIT_EXPIRED_ORDER,
    );

    expect(
      getByText(strings('bridge.limit.expired_after', { duration: '3d' })),
    ).toBeOnTheScreen();
    expect(queryByText(strings('bridge.limit.expired'))).not.toBeOnTheScreen();
  });

  it('renders a cancelled order with when it was cancelled and no status tag', () => {
    const { getByText, queryByText } = renderLimitOrderRow(
      MOCK_LIMIT_CANCELLED_ORDER,
    );

    expect(
      getByText(strings('bridge.limit.canceled_at', { date: 'Sep 2' })),
    ).toBeOnTheScreen();
    expect(queryByText(strings('bridge.limit.canceled'))).not.toBeOnTheScreen();
  });

  it('renders a cancelled order without a close time with its expiry date', () => {
    const { getByText } = renderLimitOrderRow({
      ...MOCK_LIMIT_CANCELLED_ORDER,
      timingData: {
        ...MOCK_LIMIT_CANCELLED_ORDER.timingData,
        closedAt: undefined,
      },
    });

    expect(
      getByText(strings('bridge.limit.canceled_at', { date: 'Sep 9' })),
    ).toBeOnTheScreen();
  });

  it('renders a failed order with when it failed and no status tag', () => {
    const { getByText, queryByText } = renderLimitOrderRow(
      MOCK_LIMIT_FAILED_ORDER,
    );

    expect(
      getByText(strings('bridge.limit.failed_at', { date: 'Sep 1' })),
    ).toBeOnTheScreen();
    expect(queryByText(strings('bridge.limit.failed'))).not.toBeOnTheScreen();
  });
});
