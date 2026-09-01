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
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  FontWeight,
  IconName,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  CHASE_ORDER_STATUS,
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  type ChaseOrder,
  type Order,
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import BigNumber from 'bignumber.js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { getIntlNumberFormatter } from '../../../../../../util/intl';
import Logger from '../../../../../../util/Logger';
import { ensureError } from '../../../../../../util/errorUtils';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { useHaptics } from '../../../../../../util/haptics';
import { usePerpsProPositionsPanelActions } from '../../../hooks/usePerpsProPositionsPanelActions';
import { usePerpsEventTracking } from '../../../hooks/usePerpsEventTracking';
import { usePerpsProOrdersPreferences } from '../../../hooks/usePerpsProOrdersPreferences';
import { usePerpsProPositionsPreferences } from '../../../hooks/usePerpsProPositionsPreferences';
import { usePerpsMarkets } from '../../../hooks/usePerpsMarkets';
import {
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from '../../../hooks/stream';
import type { PerpsMarketDetailSectionState } from '../../../hooks/usePerpsMarketDetailSession';
import {
  PERPS_PRO_CHASE_VISIBLE_COUNT_SELECTOR,
  getPerpsProOrderRowSelector,
  getPerpsProChaseDistanceSelector,
  getPerpsProChaseRowSelector,
  getPerpsProChaseRepriceSelector,
  getPerpsProChaseStatusSelector,
  getPerpsProChaseTerminateSelector,
  getPerpsProPositionRowSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import { calculatePositionAggregateTotals } from '../../../utils/pnlCalculations';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatProOrderCardTimestamp,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';
import { usePerpsTrading } from '../../../hooks/usePerpsTrading';
import {
  isExpectedChaseOrderRequestError,
  usePerpsChaseOrders,
} from '../../../hooks/usePerpsChaseOrders';
import { selectPerpsMobileChaseEnabledFlag } from '../../../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../../../selectors/perpsController';
import { CHASE_HISTORY_STATUSES } from '../../../constants/perpsConfig';
import usePerpsToasts from '../../../hooks/usePerpsToasts';
import { registerVisibleChaseOrderSymbols } from '../../../services/ChaseOrderVisibility';
import PerpsTokenLogo from '../../../components/PerpsTokenLogo';
import PerpsProOrderCard from './PerpsProOrderCard';
import PerpsProOrdersEmptyState from './PerpsProOrdersEmptyState';
import PerpsProOrdersSortSheet from './PerpsProOrdersSortSheet';
import PerpsProOrdersSummary from './PerpsProOrdersSummary';
import PerpsProPositionCard from './PerpsProPositionCard';
import PerpsProPositionsEmptyState from './PerpsProPositionsEmptyState';
import PerpsProPositionsSideFilterSheet from './PerpsProPositionsSideFilterSheet';
import PerpsProPositionsSortSheet from './PerpsProPositionsSortSheet';
import PerpsProTabEmptyState from './PerpsProTabEmptyState';
import PerpsProUnrealizedPnl from './PerpsProUnrealizedPnl';
import {
  DEFAULT_PRO_ORDER_SIDE_FILTER,
  DEFAULT_PRO_POSITION_SIDE_FILTER,
  filterProOrdersBySide,
  filterProPositionsBySide,
  getProOrderSideFilterEmptyDescriptionKey,
  getProPositionSideFilterButtonLabelKey,
  getProPositionSideFilterEmptyDescriptionKey,
} from '../utils/proPositionSideFilter';
import { sortProOrders } from '../utils/proOrderSort';
import { sortProPositions } from '../utils/proPositionSort';

const POSITIONS_TAB_INDEX = 0;
const ORDERS_TAB_INDEX = 1;
const CHASE_TAB_INDEX = 2;
type ChaseActivityFilter = 'active' | 'history';

const isChaseHistoryOrder = (order: ChaseOrder) =>
  CHASE_HISTORY_STATUSES.has(order.status);

const CHASE_STATUS_I18N_KEYS: Record<ChaseOrder['status'], string> = {
  [CHASE_ORDER_STATUS.Active]: 'perps.order.chase.running',
  [CHASE_ORDER_STATUS.TerminationPending]:
    'perps.order.chase.status.termination_pending',
  [CHASE_ORDER_STATUS.Backgrounded]: 'perps.order.chase.status.backgrounded',
  [CHASE_ORDER_STATUS.MaxDistanceReached]:
    'perps.order.chase.status.max_distance_reached',
  [CHASE_ORDER_STATUS.DurationReached]:
    'perps.order.chase.status.duration_reached',
  [CHASE_ORDER_STATUS.RepricingLimitReached]:
    'perps.order.chase.status.repricing_limit_reached',
  [CHASE_ORDER_STATUS.Filled]: 'perps.order.chase.status.filled',
  [CHASE_ORDER_STATUS.Canceled]: 'perps.order.chase.status.canceled',
  [CHASE_ORDER_STATUS.Failed]: 'perps.order.chase.status.failed',
};

const getChaseStatusLabel = (status: ChaseOrder['status']) =>
  strings(CHASE_STATUS_I18N_KEYS[status]);

const ChaseKeyValueItem = ({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) => (
  <Box>
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      testID={testID}
    >
      {value}
    </Text>
  </Box>
);

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
  /** Navigates to the order history screen. */
  onHistoryPress?: () => void;
  onResolvedStateChange?: (
    symbol: string,
    state: PerpsMarketDetailSectionState,
    deliveryRevisions: { positions: number; orders: number },
  ) => void;
  isMarketContextReady?: boolean;
  marketContextKey?: string;
  isScreenFocused?: boolean;
}

/**
 * Pro-mode positions/orders section.
 *
 * Renders the two-tab bar (Positions / Orders) matching the Figma design.
 * Positions, Orders, and Chase tabs present the user's live and retained
 * trading state. Position and order preferences persist via PerpsController;
 * Chase retains controller order while its side/ticker filters stay local.
 *
 * Summary P&L and position cards always share one data flow: derive
 * `visiblePositions`, compute `aggregateTotals` from that array, and render
 * both from those results so filter state never swaps data freshness sources.
 */
const PerpsProPositionsPanel = ({
  symbol,
  onSelectMarket,
  onHistoryPress,
  onResolvedStateChange,
  isMarketContextReady = true,
  marketContextKey = '',
  isScreenFocused = true,
}: PerpsProPositionsPanelProps) => {
  const perpsNetwork = useSelector(selectPerpsNetwork);
  const activeProvider = useSelector(selectPerpsProvider);
  const { playSelection } = useHaptics();
  const { track } = usePerpsEventTracking();
  const { cancelOrder } = usePerpsTrading();
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const isChaseEnabled = useSelector(selectPerpsMobileChaseEnabledFlag);
  const { chaseOrders, getChaseOrders } = usePerpsChaseOrders({
    isEnabled: isChaseEnabled,
  });
  const [activeIndex, setActiveIndex] = useState(POSITIONS_TAB_INDEX);
  const [isTickerOnly, setIsTickerOnly] = useState(false);
  const [chaseSideFilter, setChaseSideFilter] = useState(
    DEFAULT_PRO_ORDER_SIDE_FILTER,
  );
  const [chaseActivityFilter, setChaseActivityFilter] =
    useState<ChaseActivityFilter>('active');
  const [isFilledOnly, setIsFilledOnly] = useState(false);
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);
  const [isSideFilterSheetOpen, setIsSideFilterSheetOpen] = useState(false);
  const [terminatingChaseHandle, setTerminatingChaseHandle] = useState<
    string | null
  >(null);
  const shouldShowChaseTab = isChaseEnabled || chaseOrders.length > 0;
  useEffect(() => {
    if (!shouldShowChaseTab && activeIndex === CHASE_TAB_INDEX) {
      setActiveIndex(ORDERS_TAB_INDEX);
    }
  }, [activeIndex, shouldShowChaseTab]);
  const {
    sideFilter: positionsSideFilter,
    sortConfig,
    setSideFilter: setPositionsSideFilter,
    setSortConfig,
  } = usePerpsProPositionsPreferences();
  const {
    sideFilter: ordersSideFilter,
    sortConfig: orderSortConfig,
    setSideFilter: setOrdersSideFilter,
    setSortConfig: setOrderSortConfig,
  } = usePerpsProOrdersPreferences();
  const handleTickerOnlyChange = useCallback(
    (nextIsTickerOnly: boolean) => {
      if (nextIsTickerOnly === isTickerOnly) {
        return;
      }
      playSelection().catch(() => undefined);
      setIsTickerOnly(nextIsTickerOnly);
    },
    [isTickerOnly, playSelection],
  );
  const {
    positions,
    isInitialLoading,
    deliveryRevision: positionsDeliveryRevision = 0,
  } = usePerpsLivePositions({ throttleMs: 1000, useLivePnl: true });
  const {
    orders,
    isInitialLoading: areOrdersInitiallyLoading,
    deliveryRevision: ordersDeliveryRevision = 0,
  } = usePerpsLiveOrders({ throttleMs: 1000 });
  const {
    handleClosePosition,
    handleReversePosition,
    handleSharePosition,
    handleEditPositionTpSl,
    handleEditPositionMargin,
    handleCancelOrder,
    handleEditOrderPrice,
    handleEditOrderSize,
    handleCloseAllPress,
    handleCancelAllPress,
    cancelingOrderId,
    editingOrderId,
    isOrderCancelable,
    isOrderEditable,
    isOrderSizeEditable,
    isPositionMarginEditable,
    renderActionSheets,
  } = usePerpsProPositionsPanelActions();
  const { markets } = usePerpsMarkets();

  useEffect(() => {
    const deliveryRevisions = {
      positions: positionsDeliveryRevision,
      orders: ordersDeliveryRevision,
    };
    if (!isMarketContextReady) {
      onResolvedStateChange?.(symbol, 'loading', deliveryRevisions);
      return;
    }
    if (isInitialLoading || areOrdersInitiallyLoading) {
      onResolvedStateChange?.(symbol, 'loading', deliveryRevisions);
      return;
    }
    onResolvedStateChange?.(
      symbol,
      positions.length > 0 || orders.length > 0 ? 'content' : 'empty',
      deliveryRevisions,
    );
  }, [
    areOrdersInitiallyLoading,
    isInitialLoading,
    isMarketContextReady,
    marketContextKey,
    onResolvedStateChange,
    orders.length,
    ordersDeliveryRevision,
    positions.length,
    positionsDeliveryRevision,
    symbol,
  ]);

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
  const locale = I18n.locale;
  const chaseDistanceFormatter = useMemo(
    () =>
      getIntlNumberFormatter(locale, {
        maximumFractionDigits: 2,
      }),
    [locale],
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

  const isOrdersTab = activeIndex === ORDERS_TAB_INDEX;
  const isChaseTab = activeIndex === CHASE_TAB_INDEX;
  const activeSideFilter = isChaseTab
    ? chaseSideFilter
    : isOrdersTab
      ? ordersSideFilter
      : positionsSideFilter;
  const setActiveSideFilter = isChaseTab
    ? setChaseSideFilter
    : isOrdersTab
      ? setOrdersSideFilter
      : setPositionsSideFilter;

  const sideFilteredPositions = useMemo(
    () => filterProPositionsBySide(visiblePositions, positionsSideFilter),
    [positionsSideFilter, visiblePositions],
  );

  const isPositionsFiltered =
    isTickerOnly || positionsSideFilter !== DEFAULT_PRO_POSITION_SIDE_FILTER;

  const sideFilteredOrders = useMemo(
    () => filterProOrdersBySide(visibleOrders, ordersSideFilter),
    [ordersSideFilter, visibleOrders],
  );

  const areOrdersFiltered =
    isTickerOnly || ordersSideFilter !== DEFAULT_PRO_ORDER_SIDE_FILTER;

  const sortedVisiblePositions = useMemo(
    () =>
      sortProPositions(sideFilteredPositions, sortConfig, fundingRatesBySymbol),
    [fundingRatesBySymbol, sideFilteredPositions, sortConfig],
  );

  const sortedVisibleOrders = useMemo(
    () => sortProOrders(sideFilteredOrders, orderSortConfig),
    [orderSortConfig, sideFilteredOrders],
  );

  const visibleChaseOrders = useMemo(
    () =>
      chaseOrders.filter((order) => {
        if (isTickerOnly && order.symbol !== symbol) {
          return false;
        }
        if (chaseSideFilter === 'all') {
          return true;
        }
        return chaseSideFilter === 'long'
          ? order.side === 'buy'
          : order.side === 'sell';
      }),
    [chaseOrders, chaseSideFilter, isTickerOnly, symbol],
  );
  const activeChaseOrders = useMemo(
    () => visibleChaseOrders.filter((order) => !isChaseHistoryOrder(order)),
    [visibleChaseOrders],
  );
  const allActiveChaseOrders = useMemo(
    () => chaseOrders.filter((order) => !isChaseHistoryOrder(order)),
    [chaseOrders],
  );
  const historyChaseOrders = useMemo(
    () =>
      visibleChaseOrders.filter(
        (order) =>
          isChaseHistoryOrder(order) &&
          (!isFilledOnly || order.status === CHASE_ORDER_STATUS.Filled),
      ),
    [isFilledOnly, visibleChaseOrders],
  );
  const displayedChaseOrders =
    chaseActivityFilter === 'active' ? activeChaseOrders : historyChaseOrders;
  const displayedChaseSymbols = useMemo(
    () => displayedChaseOrders.map((order) => order.symbol),
    [displayedChaseOrders],
  );
  useEffect(() => {
    if (!isScreenFocused || !isChaseTab || chaseActivityFilter !== 'active') {
      return;
    }
    return registerVisibleChaseOrderSymbols(displayedChaseSymbols);
  }, [chaseActivityFilter, displayedChaseSymbols, isChaseTab, isScreenFocused]);
  const unfilteredActivityChaseOrders = useMemo(
    () =>
      chaseOrders.filter((order) =>
        chaseActivityFilter === 'active'
          ? !isChaseHistoryOrder(order)
          : isChaseHistoryOrder(order) &&
            (!isFilledOnly || order.status === CHASE_ORDER_STATUS.Filled),
      ),
    [chaseActivityFilter, chaseOrders, isFilledOnly],
  );
  const tickerFilteredActivityChaseOrders = useMemo(
    () =>
      unfilteredActivityChaseOrders.filter(
        (order) => !isTickerOnly || order.symbol === symbol,
      ),
    [isTickerOnly, symbol, unfilteredActivityChaseOrders],
  );
  const isChaseSideFilterEmpty =
    chaseSideFilter !== 'all' &&
    tickerFilteredActivityChaseOrders.length > 0 &&
    displayedChaseOrders.length === 0;
  const chaseSideFilterEmptyDescriptionKey = isChaseSideFilterEmpty
    ? `perps.order.chase.empty_${chaseSideFilter}`
    : undefined;
  const filteredChaseTicker =
    isTickerOnly &&
    unfilteredActivityChaseOrders.length > 0 &&
    tickerFilteredActivityChaseOrders.length === 0
      ? displaySymbol
      : undefined;

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
    ...(shouldShowChaseTab
      ? [
          {
            key: 'chase',
            label:
              allActiveChaseOrders.length > 0
                ? strings('perps.order.chase.tab_with_count', {
                    count: allActiveChaseOrders.length,
                  })
                : strings('perps.order.chase.tab'),
            content: null,
            testID: PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_CHASE,
          },
        ]
      : []),
  ];

  const hasPositions = sortedVisiblePositions.length > 0;
  const hasAnyPositions = positions.length > 0;
  const isSideFilterEmpty =
    positionsSideFilter !== DEFAULT_PRO_POSITION_SIDE_FILTER &&
    sideFilteredPositions.length === 0 &&
    visiblePositions.length > 0;
  const sideFilterEmptyDescriptionKey = isSideFilterEmpty
    ? getProPositionSideFilterEmptyDescriptionKey(positionsSideFilter)
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
    ordersSideFilter !== DEFAULT_PRO_ORDER_SIDE_FILTER &&
    sideFilteredOrders.length === 0 &&
    visibleOrders.length > 0;
  const orderSideFilterEmptyDescriptionKey = isOrderSideFilterEmpty
    ? getProOrderSideFilterEmptyDescriptionKey(ordersSideFilter)
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
            positionCount={sideFilteredPositions.length}
            isFiltered={isPositionsFiltered}
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
          <PerpsProOrdersSummary
            orderCount={sideFilteredOrders.length}
            onCancelAll={handleCancelAllPress}
          />
          {sortedVisibleOrders.map((order, index) => (
            <PerpsProOrderCard
              key={order.orderId}
              order={order}
              testID={getPerpsProOrderRowSelector(order.symbol, index)}
              onPress={onSelectMarket ? handleSelectOrderMarket : undefined}
              onCancel={handleCancelOrder}
              onEditPrice={handleEditOrderPrice}
              onEditSize={handleEditOrderSize}
              isCancelDisabled={
                !isOrderCancelable(order) ||
                cancelingOrderId !== null ||
                editingOrderId !== null
              }
              isEditPriceDisabled={
                !isOrderEditable(order) ||
                cancelingOrderId !== null ||
                editingOrderId !== null
              }
              isEditSizeDisabled={
                !isOrderSizeEditable(order) ||
                cancelingOrderId !== null ||
                editingOrderId !== null
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
      labelProps={{ variant: TextVariant.BodySm }}
      isSelected={isTickerOnly}
      onChange={handleTickerOnlyChange}
      testID={PerpsProMarketViewSelectorsIDs.POSITIONS_TICKER_ONLY}
    />
  );

  const handleTerminateChase = useCallback(
    async (order: ChaseOrder) => {
      if (terminatingChaseHandle) return;
      setTerminatingChaseHandle(order.handle);
      try {
        const result = await cancelOrder({
          orderId: order.handle,
          // Chase rotates ordinary child IDs while repricing, so no one child can
          // provide a stable order-absence confirmation boundary.
          skipCufConfirmationTrace: true,
          symbol: order.symbol,
          orderType: 'chase',
          providerId: order.providerId,
        });
        if (!result.success) {
          showToast(
            PerpsToastOptions.orderManagement.shared.cancellationFailed,
          );
          return;
        }
        try {
          await getChaseOrders();
        } catch (error) {
          // The exchange already accepted cancellation. A failed follow-up read
          // must not tell the user to retry the completed financial action.
          if (isExpectedChaseOrderRequestError(error)) {
            Logger.log('Chase refresh skipped after accepted cancellation', {
              code: error.code,
            });
          } else {
            Logger.error(
              ensureError(
                error,
                'PerpsProPositionsPanel.refreshAfterTerminateChase',
              ),
              {
                tags: {
                  feature: PERPS_CONSTANTS.FeatureName,
                  component: 'PerpsProPositionsPanel',
                  action: 'refresh_after_terminate_chase',
                  provider: order.providerId ?? activeProvider,
                  network: perpsNetwork,
                },
                context: {
                  name: 'PerpsProPositionsPanel.refreshAfterTerminateChase',
                  data: {
                    symbol: order.symbol,
                    provider: order.providerId ?? activeProvider,
                    network: perpsNetwork,
                  },
                },
              },
            );
          }
        }
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.CHASE_TERMINATED,
          [PERPS_EVENT_PROPERTY.ASSET]: order.symbol,
        });
      } catch (error) {
        Logger.error(
          ensureError(error, 'PerpsProPositionsPanel.handleTerminateChase'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'PerpsProPositionsPanel',
              action: 'terminate_chase',
              provider: order.providerId ?? activeProvider,
              network: perpsNetwork,
            },
            context: {
              name: 'PerpsProPositionsPanel.handleTerminateChase',
              data: {
                symbol: order.symbol,
                provider: order.providerId ?? activeProvider,
                network: perpsNetwork,
              },
            },
          },
        );
        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
      } finally {
        setTerminatingChaseHandle(null);
      }
    },
    [
      activeProvider,
      cancelOrder,
      getChaseOrders,
      perpsNetwork,
      PerpsToastOptions.orderManagement.shared.cancellationFailed,
      showToast,
      terminatingChaseHandle,
      track,
    ],
  );

  const handleChaseActivityChange = useCallback(
    (value: string) => {
      if (value !== 'active' && value !== 'history') return;
      playSelection().catch(() => undefined);
      setChaseActivityFilter(value);
    },
    [playSelection],
  );
  const handleFilledOnlyChange = useCallback(
    (value: boolean) => {
      if (value === isFilledOnly) return;
      playSelection().catch(() => undefined);
      setIsFilledOnly(value);
    },
    [isFilledOnly, playSelection],
  );

  const renderChaseCard = (order: ChaseOrder, index: number) => {
    const displayOrderSymbol = getPerpsDisplaySymbol(order.symbol);
    const isHistoryOrder = isChaseHistoryOrder(order);
    const isCancelable = !isHistoryOrder;
    const isFilled = order.status === CHASE_ORDER_STATUS.Filled;
    const filledSize = BigNumber(order.originalSize)
      .minus(order.remainingSize)
      .abs()
      .toString();
    const statusLabel = getChaseStatusLabel(order.status);
    const restingPrice =
      Number.isFinite(Number.parseFloat(order.restingPrice)) &&
      Number.parseFloat(order.restingPrice) > 0
        ? formatPerpsFiat(order.restingPrice, {
            ranges: PRICE_RANGES_UNIVERSAL,
          })
        : PERPS_CONSTANTS.FallbackPriceDisplay;
    const maxDistance =
      order.maxDistanceBps === undefined
        ? PERPS_CONSTANTS.FallbackPercentageDisplay
        : `${chaseDistanceFormatter.format(order.maxDistanceBps / 100)}%`;
    const distanceChased = `${chaseDistanceFormatter.format(
      order.distanceChasedBps / 100,
    )}%`;
    const displayedDistanceLabel = isHistoryOrder
      ? strings('perps.order.chase.card.max_distance')
      : strings('perps.order.chase.card.distance_chased');
    const displayedDistance = isHistoryOrder
      ? maxDistance
      : order.maxDistanceBps === undefined
        ? distanceChased
        : strings('perps.order.chase.card.distance_chased_with_max', {
            distance: distanceChased,
            max: maxDistance,
          });
    const progressLabel =
      order.status === CHASE_ORDER_STATUS.Active &&
      order.maxDistanceBps !== undefined
        ? strings('perps.order.chase.running_with_progress', {
            progress: `${Math.min(
              100,
              Math.round(
                (order.distanceChasedBps / order.maxDistanceBps) * 100,
              ),
            )}%`,
          })
        : statusLabel;
    const isCanceling = terminatingChaseHandle === order.handle;

    return (
      <View
        key={order.handle}
        collapsable={false}
        testID={getPerpsProChaseRowSelector(
          order.symbol,
          order.handle,
          index === 0,
        )}
      >
        <Box twClassName="gap-3 py-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4 px-2 py-2"
          >
            <PerpsTokenLogo symbol={order.symbol} size={40} />
            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {displayOrderSymbol}
                </Text>
                <Tag
                  severity={
                    order.side === 'buy'
                      ? TagSeverity.Success
                      : TagSeverity.Danger
                  }
                >
                  {strings(
                    order.side === 'buy'
                      ? 'perps.market.long'
                      : 'perps.market.short',
                  )}
                </Tag>
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {formatProOrderCardTimestamp(order.startedAt)}
              </Text>
            </Box>
            <View
              accessible
              accessibilityLabel={progressLabel}
              testID={getPerpsProChaseStatusSelector(
                order.status,
                order.symbol,
                order.handle,
                index === 0,
              )}
            >
              <Tag
                severity={isFilled ? TagSeverity.Success : TagSeverity.Neutral}
              >
                {progressLabel}
              </Tag>
            </View>
          </Box>
          <Box twClassName="px-2">
            <Box
              flexDirection={BoxFlexDirection.Row}
              twClassName="gap-4 rounded-xl border border-muted px-4 py-3"
            >
              <Box twClassName="flex-1 gap-3">
                <ChaseKeyValueItem
                  label={strings('perps.order.chase.card.size')}
                  value={`${formatPositionSize(order.originalSize)} ${displayOrderSymbol}`}
                />
                <ChaseKeyValueItem
                  label={strings('perps.order.chase.card.filled_size')}
                  value={`${formatPositionSize(filledSize)} ${displayOrderSymbol}`}
                />
              </Box>
              <Box twClassName="flex-1 gap-3">
                <ChaseKeyValueItem
                  label={strings('perps.order.limit_price')}
                  value={restingPrice}
                  testID={
                    order.repricings > 0
                      ? getPerpsProChaseRepriceSelector(
                          order.symbol,
                          order.handle,
                          index === 0,
                        )
                      : undefined
                  }
                />
                <ChaseKeyValueItem
                  label={displayedDistanceLabel}
                  value={displayedDistance}
                  testID={
                    isHistoryOrder
                      ? undefined
                      : getPerpsProChaseDistanceSelector(
                          order.symbol,
                          order.handle,
                          index === 0,
                        )
                  }
                />
              </Box>
            </Box>
          </Box>
          {isCancelable ? (
            <Box twClassName="px-2">
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Sm}
                isDanger
                isFullWidth
                isLoading={isCanceling}
                onPress={() => handleTerminateChase(order)}
                isDisabled={terminatingChaseHandle !== null}
                testID={getPerpsProChaseTerminateSelector(
                  order.status,
                  order.symbol,
                  order.handle,
                  index === 0,
                )}
              >
                {strings('perps.order.chase.cancel')}
              </Button>
            </Box>
          ) : null}
        </Box>
      </View>
    );
  };

  const renderChaseTab = () => (
    <Box twClassName="gap-2 px-2 pt-3">
      <Text
        accessible
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        testID={PERPS_PRO_CHASE_VISIBLE_COUNT_SELECTOR}
      >
        {strings('perps.order.chase.visible_count', {
          count: displayedChaseOrders.length,
        })}
      </Text>
      {displayedChaseOrders.length === 0 ? (
        <Box
          testID={PerpsProMarketViewSelectorsIDs.CHASE_EMPTY_STATE}
          twClassName="items-center justify-center pt-3"
        >
          <PerpsProTabEmptyState
            filteredTicker={filteredChaseTicker}
            filteredSideDescriptionKey={chaseSideFilterEmptyDescriptionKey}
            emptyDescriptionKey={
              chaseActivityFilter === 'active'
                ? 'perps.order.chase.empty'
                : 'perps.order.chase.empty_history'
            }
            filteredTickerDescriptionKey="perps.order.chase.empty_filtered"
          />
        </Box>
      ) : (
        displayedChaseOrders.map((order, index) =>
          renderChaseCard(order, index),
        )
      )}
    </Box>
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
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="pr-2"
      >
        <Box twClassName="flex-1">
          <TabsBar
            key={shouldShowChaseTab ? 'chase-visible' : 'chase-hidden'}
            tabs={tabs}
            activeIndex={activeIndex}
            onTabPress={setActiveIndex}
            twClassName="-mx-2"
            testID={PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TABS}
          />
        </Box>
        {onHistoryPress ? (
          <ButtonIcon
            iconName={IconName.Clock}
            size={ButtonIconSize.Md}
            onPress={onHistoryPress}
            accessibilityLabel={strings(
              'perps.pro_positions_panel.order_history',
            )}
            testID={PerpsProMarketViewSelectorsIDs.POSITIONS_HISTORY_BUTTON}
          />
        ) : null}
      </Box>
      {isChaseTab ? (
        <Box twClassName="px-2 pt-3">
          <FilterButtonGroup
            value={chaseActivityFilter}
            onChange={handleChaseActivityChange}
            variant={FilterButtonVariant.Primary}
            twClassName="gap-2"
          >
            <FilterButton
              value="active"
              testID={PerpsProMarketViewSelectorsIDs.CHASE_ACTIVE_FILTER}
            >
              {strings('perps.order.chase.active')}
            </FilterButton>
            <FilterButton
              value="history"
              testID={PerpsProMarketViewSelectorsIDs.CHASE_HISTORY_FILTER}
            >
              {strings('perps.order.chase.history')}
            </FilterButton>
          </FilterButtonGroup>
        </Box>
      ) : null}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 px-2 pt-3"
        accessible={false}
      >
        {!isChaseTab ? (
          <Box twClassName="bg-muted rounded-lg">
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
          </Box>
        ) : null}
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          endIconName={IconName.ArrowDown}
          onPress={() => setIsSideFilterSheetOpen(true)}
          testID={
            isChaseTab
              ? PerpsProMarketViewSelectorsIDs.CHASE_SIDE_FILTER_BUTTON
              : PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_BUTTON
          }
        >
          {strings(getProPositionSideFilterButtonLabelKey(activeSideFilter))}
        </Button>
        <Box twClassName="bg-muted rounded-lg px-2 py-1">
          {renderTickerOnlyCheckbox()}
        </Box>
        {isChaseTab && chaseActivityFilter === 'history' ? (
          <Box twClassName="bg-muted rounded-lg px-2 py-1">
            <Checkbox
              label={strings('perps.order.chase.filled_only')}
              labelProps={{ variant: TextVariant.BodySm }}
              isSelected={isFilledOnly}
              onChange={handleFilledOnlyChange}
              testID={PerpsProMarketViewSelectorsIDs.CHASE_FILLED_ONLY}
            />
          </Box>
        ) : null}
      </Box>
      {activeIndex === CHASE_TAB_INDEX
        ? renderChaseTab()
        : activeIndex === ORDERS_TAB_INDEX
          ? renderOrdersTab()
          : renderPositionsTab()}
      {renderActionSheets(
        sideFilteredPositions,
        isPositionsFiltered,
        sideFilteredOrders,
        areOrdersFiltered,
      )}
      {activeIndex === ORDERS_TAB_INDEX ? (
        <PerpsProOrdersSortSheet
          isVisible={isSortSheetOpen}
          sortConfig={orderSortConfig}
          onApply={setOrderSortConfig}
          onClose={() => setIsSortSheetOpen(false)}
          testID={PerpsProMarketViewSelectorsIDs.ORDERS_SORT_SHEET}
        />
      ) : activeIndex === POSITIONS_TAB_INDEX ? (
        <PerpsProPositionsSortSheet
          isVisible={isSortSheetOpen}
          sortConfig={sortConfig}
          onApply={setSortConfig}
          onClose={() => setIsSortSheetOpen(false)}
          testID={PerpsProMarketViewSelectorsIDs.POSITIONS_SORT_SHEET}
        />
      ) : null}
      <PerpsProPositionsSideFilterSheet
        isVisible={isSideFilterSheetOpen}
        sideFilter={activeSideFilter}
        onApply={setActiveSideFilter}
        onClose={() => setIsSideFilterSheetOpen(false)}
        testID={
          isChaseTab
            ? PerpsProMarketViewSelectorsIDs.CHASE_SIDE_FILTER_SHEET
            : PerpsProMarketViewSelectorsIDs.POSITIONS_SIDE_FILTER_SHEET
        }
      />
    </Box>
  );
};

export default PerpsProPositionsPanel;
