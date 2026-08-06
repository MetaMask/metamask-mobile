import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  IconName,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type Order,
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import React, { useCallback, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { usePerpsProPositionsPanelActions } from '../../../hooks/usePerpsProPositionsPanelActions';
import { usePerpsMarkets } from '../../../hooks/usePerpsMarkets';
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
import PerpsProOrdersSortSheet from './PerpsProOrdersSortSheet';
import PerpsProPositionCard from './PerpsProPositionCard';
import PerpsProPositionsEmptyState from './PerpsProPositionsEmptyState';
import PerpsProPositionsSideFilterSheet from './PerpsProPositionsSideFilterSheet';
import PerpsProPositionsSortSheet from './PerpsProPositionsSortSheet';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';
import {
  DEFAULT_PRO_POSITION_SIDE_FILTER,
  filterProOrdersBySide,
  filterProPositionsBySide,
  getProOrderSideFilterEmptyDescriptionKey,
  getProPositionSideFilterButtonLabelKey,
  getProPositionSideFilterEmptyDescriptionKey,
  type ProPositionSideFilter,
} from '../utils/proPositionSideFilter';
import {
  DEFAULT_PRO_ORDER_SORT,
  sortProOrders,
  type ProOrderSortConfig,
} from '../utils/proOrderSort';
import {
  DEFAULT_PRO_POSITION_SORT,
  sortProPositions,
  type ProPositionSortConfig,
} from '../utils/proPositionSort';

const POSITIONS_TAB_INDEX = 0;
const ORDERS_TAB_INDEX = 1;

/** Which Pro panel tab a market-switch row tap came from. */
export type ProPositionsPanelSourceSection =
  | typeof PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS
  | typeof PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS;

interface PerpsProPositionsPanelProps {
  /** Active market symbol, which may carry a `dex:` prefix for HIP-3 markets. */
  symbol: string;
  /** Switches the screen to the market of a tapped position/order row. */
  onSelectMarket?: (
    market: PerpsMarketData | Partial<PerpsMarketData>,
    sourceSection: ProPositionsPanelSourceSection,
  ) => void;
}

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * The Positions tab shows the user's open positions across all assets,
 * falling back to an empty state when there are none.
 * The sort, side, and `$TICKER only` controls apply to both tabs. Positions
 * and orders use domain-specific sort fields while sharing side and market
 * filters.
 *
 * Summary P&L and position cards always share one data flow: derive
 * `visiblePositions`, compute `aggregateTotals` from that array, and render
 * both from those results so filter state never swaps data freshness sources.
 */
const PerpsProPositionsPanel = ({
  symbol,
  onSelectMarket,
}: PerpsProPositionsPanelProps) => {
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);
  const [isTickerOnly, setIsTickerOnly] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isSideFilterSheetOpen, setIsSideFilterSheetOpen] = useState(false);
  const [sideFilter, setSideFilter] = useState<ProPositionSideFilter>(
    DEFAULT_PRO_POSITION_SIDE_FILTER,
  );
  const [sortConfig, setSortConfig] = useState<ProPositionSortConfig>(
    DEFAULT_PRO_POSITION_SORT,
  );
  const [orderSortConfig, setOrderSortConfig] = useState<ProOrderSortConfig>(
    DEFAULT_PRO_ORDER_SORT,
  );
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
  const { markets } = usePerpsMarkets();

  const displaySymbol = getPerpsDisplaySymbol(symbol);

  // Rows carry only a symbol, so resolve the full market here where the list is
  // already loaded; the caller falls back to enriching a symbol-only market.
  const selectMarketBySymbol = useCallback(
    (nextSymbol: string, sourceSection: ProPositionsPanelSourceSection) => {
      onSelectMarket?.(
        markets.find((market) => market.symbol === nextSymbol) ?? {
          symbol: nextSymbol,
        },
        sourceSection,
      );
    },
    [markets, onSelectMarket],
  );

  const handleSelectPositionMarket = useCallback(
    (position: Position) =>
      selectMarketBySymbol(
        position.symbol,
        PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS,
      ),
    [selectMarketBySymbol],
  );

  const handleSelectOrderMarket = useCallback(
    (order: Order) =>
      selectMarketBySymbol(
        order.symbol,
        PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS,
      ),
    [selectMarketBySymbol],
  );

  const fundingRatesBySymbol = useMemo(
    () =>
      Object.fromEntries(
        markets.map((market) => [market.symbol, market.fundingRate]),
      ),
    [markets],
  );

  const visiblePositions = useMemo(
    () =>
      isTickerOnly
        ? positions.filter((position) => position.symbol === symbol)
        : positions,
    [isTickerOnly, positions, symbol],
  );

  const visibleOrders = useMemo(
    () =>
      isTickerOnly ? orders.filter((order) => order.symbol === symbol) : orders,
    [isTickerOnly, orders, symbol],
  );

  const sideFilteredPositions = useMemo(
    () => filterProPositionsBySide(visiblePositions, sideFilter),
    [sideFilter, visiblePositions],
  );

  const sideFilteredOrders = useMemo(
    () => filterProOrdersBySide(visibleOrders, sideFilter),
    [sideFilter, visibleOrders],
  );

  const sortedVisiblePositions = useMemo(
    () =>
      sortProPositions(sideFilteredPositions, sortConfig, fundingRatesBySymbol),
    [fundingRatesBySymbol, sideFilteredPositions, sortConfig],
  );

  const sortedVisibleOrders = useMemo(
    () => sortProOrders(sideFilteredOrders, orderSortConfig),
    [orderSortConfig, sideFilteredOrders],
  );

  const aggregateTotals = useMemo(
    () => calculatePositionAggregateTotals(sideFilteredPositions),
    [sideFilteredPositions],
  );

  const openPositionsCount = sideFilteredPositions.length;
  const positionsTabLabel =
    openPositionsCount > 0
      ? strings('perps.pro_positions_panel.positions_with_count', {
          count: openPositionsCount,
        })
      : strings('perps.pro_positions_panel.positions');

  const openOrdersCount = sideFilteredOrders.length;
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

  const hasPositions = sortedVisiblePositions.length > 0;
  const hasAnyPositions = positions.length > 0;
  const isSideFilterEmpty =
    sideFilter !== 'all' &&
    sideFilteredPositions.length === 0 &&
    visiblePositions.length > 0;
  const sideFilterEmptyDescriptionKey = isSideFilterEmpty
    ? getProPositionSideFilterEmptyDescriptionKey(sideFilter)
    : undefined;
  const filteredTicker =
    isTickerOnly &&
    hasAnyPositions &&
    visiblePositions.length === 0 &&
    !isSideFilterEmpty
      ? displaySymbol
      : undefined;

  const hasAnyOrders = orders.length > 0;
  const isOrderSideFilterEmpty =
    sideFilter !== 'all' &&
    sideFilteredOrders.length === 0 &&
    visibleOrders.length > 0;
  const orderSideFilterEmptyDescriptionKey = isOrderSideFilterEmpty
    ? getProOrderSideFilterEmptyDescriptionKey(sideFilter)
    : undefined;
  const filteredOrdersTicker =
    isTickerOnly &&
    hasAnyOrders &&
    visibleOrders.length === 0 &&
    !isOrderSideFilterEmpty
      ? displaySymbol
      : undefined;

  const renderPositionsTab = () => {
    if (hasPositions) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.POSITIONS_LIST}>
          <PerpsProUnrealizedPnl
            unrealizedPnl={aggregateTotals.unrealizedPnl}
            returnOnEquity={aggregateTotals.returnOnEquity}
            onCloseAll={handleCloseAllPress}
          />
          {sortedVisiblePositions.map((position) => (
            <PerpsProPositionCard
              key={position.symbol}
              position={position}
              testID={getPerpsProPositionRowSelector(position.symbol)}
              onPress={onSelectMarket ? handleSelectPositionMarket : undefined}
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
          filteredTicker={filteredTicker}
          filteredSideDescriptionKey={sideFilterEmptyDescriptionKey}
        />
      </Box>
    );
  };

  const renderOrdersTab = () => {
    if (sortedVisibleOrders.length > 0) {
      return (
        <Box testID={PerpsProMarketViewSelectorsIDs.ORDERS_LIST}>
          {sortedVisibleOrders.map((order, index) => (
            <PerpsProOrderCard
              key={order.orderId}
              order={order}
              testID={getPerpsProOrderRowSelector(order.symbol, index)}
              onPress={onSelectMarket ? handleSelectOrderMarket : undefined}
              onCancel={handleCancelOrder}
              isCancelDisabled={
                !isOrderCancelable(order) || cancelingOrderId !== null
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
        <PerpsProOrdersEmptyState
          filteredTicker={filteredOrdersTicker}
          filteredSideDescriptionKey={orderSideFilterEmptyDescriptionKey}
        />
      </Box>
    );
  };

  const renderTickerOnlyCheckbox = () => (
    <Checkbox
      label={strings('perps.pro_positions_panel.ticker_only', {
        ticker: displaySymbol,
      })}
      isSelected={isTickerOnly}
      onChange={setIsTickerOnly}
      testID={PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY}
    />
  );

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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-3 px-2 pt-3"
      >
        <ButtonIcon
          iconName={IconName.Customize}
          accessibilityLabel={strings(
            activeIndex === ORDERS_TAB_INDEX
              ? 'perps.pro_positions_panel.sort.orders_settings_accessibility'
              : 'perps.pro_positions_panel.sort.settings_accessibility',
          )}
          size={ButtonIconSize.Md}
          onPress={() => setIsSortSheetOpen(true)}
          testID={PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_BUTTON}
        />
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          endIconName={IconName.ArrowDown}
          onPress={() => setIsSideFilterSheetOpen(true)}
          testID={PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_BUTTON}
        >
          {strings(getProPositionSideFilterButtonLabelKey(sideFilter))}
        </Button>
        {renderTickerOnlyCheckbox()}
      </Box>
      {activeIndex === ORDERS_TAB_INDEX
        ? renderOrdersTab()
        : renderPositionsTab()}
      {renderActionSheets()}
      {activeIndex === ORDERS_TAB_INDEX ? (
        <PerpsProOrdersSortSheet
          isVisible={isSortSheetOpen}
          sortConfig={orderSortConfig}
          onApply={setOrderSortConfig}
          onClose={() => setIsSortSheetOpen(false)}
          testID={PerpsProMarketViewSelectorsIDs.ORDERS_SORT_SHEET}
        />
      ) : (
        <PerpsProPositionsSortSheet
          isVisible={isSortSheetOpen}
          sortConfig={sortConfig}
          onApply={setSortConfig}
          onClose={() => setIsSortSheetOpen(false)}
          testID={PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_SHEET}
        />
      )}
      <PerpsProPositionsSideFilterSheet
        isVisible={isSideFilterSheetOpen}
        sideFilter={sideFilter}
        onApply={setSideFilter}
        onClose={() => setIsSideFilterSheetOpen(false)}
        testID={PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_SHEET}
      />
    </Box>
  );
};

export default PerpsProPositionsPanel;
