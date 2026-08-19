import React from 'react';
import { Box, FontWeight } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import OrdersTabs from '../../../components/OrdersTabs';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { BridgeToken } from '../../../types';

const MOCK_DEST_TOKEN: BridgeToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

const MOCK_OPEN_ORDERS = [{ id: 'mock-limit-1', token: MOCK_DEST_TOKEN }];

function renderLimitOpenOrder(item: (typeof MOCK_OPEN_ORDERS)[number]) {
  return (
    <OpenOrderRow
      token={item.token}
      title={strings('bridge.limit.pair', {
        source: 'ETH',
        dest: item.token.symbol,
      })}
      subtitle={strings('bridge.limit.expiry', { timeLeft: '4d left' })}
      primaryValue="$208.99"
      secondaryValue={strings('bridge.limit.limit_price', {
        symbol: item.token.symbol,
      })}
      subtitleFontWeight={FontWeight.Medium}
    />
  );
}

const BridgeLimitOrderView = () => (
  <Box
    twClassName="flex-1 bg-default"
    testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
  >
    <OrdersTabs
      openOrders={{
        items: MOCK_OPEN_ORDERS,
        renderItem: renderLimitOpenOrder,
        keyExtractor: (item) => item.id,
      }}
      history={{ items: [] }}
    />
  </Box>
);

export default BridgeLimitOrderView;
