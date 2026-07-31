import { Box, Checkbox } from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import React, { useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { usePerpsProPositionsPanelActions } from '../../../hooks/usePerpsProPositionsPanelActions';
import {
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from '../../../hooks/stream';
import {
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import { calculatePositionAggregateTotals } from '../../../utils/pnlCalculations';
import PerpsProOrderCard from './PerpsProOrderCard';
import PerpsProOrdersEmptyState from './PerpsProOrdersEmptyState';
import PerpsProPositionCard from './PerpsProPositionCard';
import PerpsProPositionsEmptyState from './PerpsProPositionsEmptyState';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';

const POSITIONS_TAB_INDEX = 0;
const ORDERS_TAB_INDEX = 1;

interface PerpsProPositionsPanelProps {
  symbol: string;
}

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * The Positions tab shows the user's open positions across all assets,
 * falling back to an empty state when there are none.
 * The `$TICKER only` checkbox filters positions (not orders) to the current
 * market. The Orders tab shows the user's open orders.
 *
 * Summary P&L and position cards always share one data flow: derive
 * `visiblePositions`, compute `aggregateTotals` from that array, and render
 * both from those results so filter state never swaps data freshness sources.
 */
const PerpsProPositionsPanel = ({ symbol }: PerpsProPositionsPanelProps) => {
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);
  const [isTickerOnly, setIsTickerOnly] = useState(false);
  const { positions, isInitialLoading } = usePerpsLivePositions({
    throttleMs: 1000,
    useLivePnl: true,
  });
  const { orders, isInitialLoading: areOrdersInitiallyLoading } =
    usePerpsLiveOrders({ throttleMs: 1000 });
  const {
    handleClosePosition,
    handleReversePosition,
    handleSharePosition,
    handleEditPositionTpSl,
    handleEditPositionMargin,
    handleCancelOrder,
    handleCloseAllPress,
    cancelingOrderId,
    isOrderCancelable,
    isPositionMarginEditable,
    renderActionSheets,
  } = usePerpsProPositionsPanelActions();

  const visiblePositions = useMemo(
    () =>
      isTickerOnly
        ? positions.filter(
            (position) => getPerpsDisplaySymbol(position.symbol) === symbol,
          )
        : positions,
    [isTickerOnly, positions, symbol],
  );

  const aggregateTotals = useMemo(
    () => calculatePositionAggregateTotals(visiblePositions),
    [visiblePositions],
  );

  const openPositionsCount = visiblePositions.length;
  const positionsTabLabel =
    openPositionsCount > 0
      ? strings('perps.pro_positions_panel.positions_with_count', {
          count: openPositionsCount,
        })
      : strings('perps.pro_positions_panel.positions');

  const openOrdersCount = orders.length;
  const ordersTabLabel =
    openOrdersCount > 0
      ? strings('perps.pro_positions_panel.orders_with_count', {
          count: openOrdersCount,
        })
      : strings('perps.pro_positions_panel.orders');

  const tabs: TabItem[] = [
    {
      key: 'positions',
      label: positionsTabLabel,
      content: null,
      testID: PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_POSITIONS,
    },
    {
      key: 'orders',
      label: ordersTabLabel,
      content: null,
      testID: PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS,
    },
  ];

  const hasPositions = visiblePositions.length > 0;
  const hasAnyPositions = positions.length > 0;

  const renderPositionsTab = () => {
    if (hasPositions) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.POSITIONS_LIST}>
          <PerpsProUnrealizedPnl
            unrealizedPnl={aggregateTotals.unrealizedPnl}
            returnOnEquity={aggregateTotals.returnOnEquity}
            onCloseAll={handleCloseAllPress}
          />
          {visiblePositions.map((position, index) => (
            <PerpsProPositionCard
              key={`${position.symbol}-${index}`}
              position={position}
              testID={getPerpsProPositionRowSelector(position.symbol, index)}
              onClose={handleClosePosition}
              onReverse={handleReversePosition}
              onShare={handleSharePosition}
              onEditTpSl={handleEditPositionTpSl}
              onEditMargin={handleEditPositionMargin}
              isEditMarginDisabled={!isPositionMarginEditable(position)}
            />
          ))}
        </Box>
      );
    }

    // Avoid flashing the empty state while the first stream update is pending.
    if (isInitialLoading) {
      return null;
    }

    return (
      <Box twClassName="items-center justify-center px-2 pt-6">
        <PerpsProPositionsEmptyState
          filteredTicker={isTickerOnly && hasAnyPositions ? symbol : undefined}
        />
      </Box>
    );
  };

  const renderOrdersTab = () => {
    if (orders.length > 0) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.ORDERS_LIST}>
          {orders.map((order, index) => (
            <PerpsProOrderCard
              key={order.orderId}
              order={order}
              testID={getPerpsProOrderRowSelector(order.symbol, index)}
              onCancel={handleCancelOrder}
              isCancelDisabled={
                !isOrderCancelable(order) || cancelingOrderId === order.orderId
              }
            />
          ))}
        </Box>
      );
    }

    if (areOrdersInitiallyLoading) {
      return null;
    }

    return (
      <Box twClassName="items-center justify-center px-2 pt-6">
        <PerpsProOrdersEmptyState />
      </Box>
    );
  };

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL}
      twClassName="py-3"
    >
      {/* TabsBar hardcodes its own px-4 (16px) internally — 8px more than
          the px-2 (8px) inset the rest of this panel's rows use below, which
          reads as extra padding on the tab labels. Pull it back in with a
          matching negative margin instead of touching the shared component's
          own padding (used by other tab bars across the app). */}
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}
        twClassName="-mx-2"
        testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TABS}
      />
      {activeIndex === POSITIONS_TAB_INDEX && (
        <Box twClassName="items-start px-2 pt-3">
          <Checkbox
            label={strings('perps.pro_positions_panel.ticker_only', {
              ticker: symbol,
            })}
            isSelected={isTickerOnly}
            onChange={setIsTickerOnly}
            testID={PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY}
          />
        </Box>
      )}
      {activeIndex === ORDERS_TAB_INDEX
        ? renderOrdersTab()
        : renderPositionsTab()}
      {renderActionSheets()}
    </Box>
  );
};

export default PerpsProPositionsPanel;
