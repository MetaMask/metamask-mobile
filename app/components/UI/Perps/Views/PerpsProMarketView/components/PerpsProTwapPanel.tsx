import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import React, { useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
import { PERPS_TWAP_UI_CONFIG } from '../../../constants/perpsConfig';
import { getTwapOrderIdentityKey } from '../../../utils/twapOrderUtils';
import {
  getPerpsProTwapFillRowSelector,
  getPerpsProTwapRowSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import PerpsProTwapCard from './PerpsProTwapCard';
import PerpsProTwapEmptyState from './PerpsProTwapEmptyState';
import PerpsProTwapFillRowItem from './PerpsProTwapFillRow';
import {
  PRO_TWAP_VIEWS,
  DEFAULT_PRO_TWAP_VIEW,
  selectTwapFillRows,
  type ProTwapView,
} from '../utils/proTwapViews';

export interface PerpsProTwapEmptyMetadata {
  filteredTicker?: string;
  filteredSideDescriptionKey?: string;
}

interface PerpsProTwapPanelProps {
  /** Active schedules, already ticker- and side-filtered by the caller. */
  activeTwapOrders: TwapOrder[];
  /** Terminal schedules, already ticker- and side-filtered by the caller. */
  historicalTwapOrders: TwapOrder[];
  /** Suppresses the empty state until the first fetch resolves. */
  isInitialLoading: boolean;
  onSelectMarket?: (twapOrder: TwapOrder) => void;
  onTerminate: (twapOrder: TwapOrder) => void;
  /** Global one-at-a-time cancellation lock across every provider/order. */
  isTerminationInFlight: boolean;
  /** Stable ticker/side filter identity; changes reset both paged views. */
  filterScopeKey: string;
  /** Accepted cancellation awaiting a terminal stream/REST confirmation. */
  acceptedTerminationOrderIdentityKey?: string | null;
  /** Load failure from the most recent REST read. */
  error: string | null;
  onRetry: () => void;
  /** Whether the retry/REST reconciliation read is in flight. */
  isRefreshing: boolean;
  /** Filter-specific empty copy derived independently for each subview. */
  emptyMetadataByView?: Partial<Record<ProTwapView, PerpsProTwapEmptyMetadata>>;
}

const VIEW_LABEL_KEYS: Record<ProTwapView, string> = {
  active: 'perps.pro_positions_panel.twap_views.active',
  history: 'perps.pro_positions_panel.twap_views.history',
  fill_history: 'perps.pro_positions_panel.twap_views.fill_history',
};

const VIEW_TEST_IDS: Record<ProTwapView, string> = {
  active: PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TAB_ACTIVE,
  history: PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TAB_HISTORY,
  fill_history: PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TAB_FILL_HISTORY,
};

/**
 * The TWAP tab's body: an Active / History / Fill History switch over the one
 * `getTwapOrders()` fetch the caller supplies.
 *
 * Only Active offers Terminate — a terminal schedule has nothing left to stop.
 * Fill history flattens the slice fills of every schedule in view, so it
 * follows whichever of the two lists the other views are showing.
 */
const PerpsProTwapPanel = ({
  activeTwapOrders,
  historicalTwapOrders,
  isInitialLoading,
  onSelectMarket,
  onTerminate,
  isTerminationInFlight,
  filterScopeKey,
  acceptedTerminationOrderIdentityKey = null,
  error,
  onRetry,
  isRefreshing,
  emptyMetadataByView,
}: PerpsProTwapPanelProps) => {
  const [activeViewIndex, setActiveViewIndex] = useState(() =>
    PRO_TWAP_VIEWS.indexOf(DEFAULT_PRO_TWAP_VIEW),
  );
  const [fillHistoryPage, setFillHistoryPage] = useState(0);
  const [scheduleHistoryPage, setScheduleHistoryPage] = useState(0);
  const activeView = PRO_TWAP_VIEWS[activeViewIndex] ?? DEFAULT_PRO_TWAP_VIEW;

  const fillRows = useMemo(
    () => selectTwapFillRows([...activeTwapOrders, ...historicalTwapOrders]),
    [activeTwapOrders, historicalTwapOrders],
  );
  const fillHistoryPageCount = Math.max(
    1,
    Math.ceil(fillRows.length / PERPS_TWAP_UI_CONFIG.FillHistoryPageSize),
  );
  const visibleFillHistoryPage = Math.min(
    fillHistoryPage,
    fillHistoryPageCount - 1,
  );
  const visibleFillRows = fillRows.slice(
    visibleFillHistoryPage * PERPS_TWAP_UI_CONFIG.FillHistoryPageSize,
    (visibleFillHistoryPage + 1) * PERPS_TWAP_UI_CONFIG.FillHistoryPageSize,
  );
  const scheduleHistoryPageCount = Math.max(
    1,
    Math.ceil(
      historicalTwapOrders.length / PERPS_TWAP_UI_CONFIG.HistoryPageSize,
    ),
  );
  const visibleScheduleHistoryPage = Math.min(
    scheduleHistoryPage,
    scheduleHistoryPageCount - 1,
  );
  const visibleHistoricalTwapOrders = historicalTwapOrders.slice(
    visibleScheduleHistoryPage * PERPS_TWAP_UI_CONFIG.HistoryPageSize,
    (visibleScheduleHistoryPage + 1) * PERPS_TWAP_UI_CONFIG.HistoryPageSize,
  );

  useEffect(() => {
    setFillHistoryPage((page) => Math.min(page, fillHistoryPageCount - 1));
  }, [fillHistoryPageCount]);

  useEffect(() => {
    setScheduleHistoryPage((page) =>
      Math.min(page, scheduleHistoryPageCount - 1),
    );
  }, [scheduleHistoryPageCount]);

  useEffect(() => {
    setFillHistoryPage(0);
    setScheduleHistoryPage(0);
  }, [filterScopeKey]);

  const viewTabs: TabItem[] = useMemo(
    () =>
      PRO_TWAP_VIEWS.map((view) => ({
        key: view,
        label: strings(VIEW_LABEL_KEYS[view]),
        content: null,
        testID: VIEW_TEST_IDS[view],
      })),
    [],
  );

  const renderEmptyState = () => {
    if (isInitialLoading) {
      return (
        <Box
          twClassName="items-center justify-center px-2 pt-6"
          testID={PerpsProMarketViewSelectorsIDs.TWAP_LOADING}
        >
          <Spinner />
        </Box>
      );
    }

    if (error) {
      return null;
    }

    const emptyMetadata = emptyMetadataByView?.[activeView];

    return (
      <Box twClassName="items-center justify-center px-2 pt-6">
        <PerpsProTwapEmptyState
          view={activeView}
          filteredTicker={emptyMetadata?.filteredTicker}
          filteredSideDescriptionKey={emptyMetadata?.filteredSideDescriptionKey}
        />
      </Box>
    );
  };

  const renderScheduleList = (
    twapOrders: TwapOrder[],
    isActiveView: boolean,
    pagination?: React.ReactNode,
  ) => {
    if (twapOrders.length === 0) {
      return renderEmptyState();
    }

    return (
      <Box testID={PerpsProMarketViewSelectorsIDs.TWAP_LIST}>
        {twapOrders.map((twapOrder) => (
          <PerpsProTwapCard
            key={getTwapOrderIdentityKey(twapOrder)}
            twapOrder={twapOrder}
            testID={getPerpsProTwapRowSelector(
              twapOrder.providerId,
              twapOrder.orderId,
            )}
            onPress={onSelectMarket}
            onTerminate={isActiveView ? onTerminate : undefined}
            isTerminateDisabled={
              isTerminationInFlight ||
              acceptedTerminationOrderIdentityKey ===
                getTwapOrderIdentityKey(twapOrder)
            }
          />
        ))}
        {pagination}
      </Box>
    );
  };

  const renderPagination = ({
    page,
    pageCount,
    onPrevious,
    onNext,
    previousTestID,
    nextTestID,
    pageLabelTestID,
  }: {
    page: number;
    pageCount: number;
    onPrevious: () => void;
    onNext: () => void;
    previousTestID: string;
    nextTestID: string;
    pageLabelTestID: string;
  }) =>
    pageCount > 1 ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="items-center gap-2 px-2"
      >
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          twClassName="flex-1"
          isDisabled={page === 0}
          onPress={onPrevious}
          testID={previousTestID}
        >
          {strings('perps.pro_positions_panel.twap_views.previous')}
        </Button>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={pageLabelTestID}
        >
          {strings('perps.pro_positions_panel.twap_views.page_count', {
            page: page + 1,
            total: pageCount,
          })}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          twClassName="flex-1"
          isDisabled={page >= pageCount - 1}
          onPress={onNext}
          testID={nextTestID}
        >
          {strings('perps.pro_positions_panel.twap_views.next')}
        </Button>
      </Box>
    ) : null;

  const renderFillHistory = () => {
    if (fillRows.length === 0) {
      return renderEmptyState();
    }

    return (
      <Box testID={PerpsProMarketViewSelectorsIDs.TWAP_LIST}>
        {visibleFillRows.map((row) => (
          <PerpsProTwapFillRowItem
            key={`${getTwapOrderIdentityKey(row.twapOrder)}:${row.fill.fillId}`}
            row={row}
            testID={getPerpsProTwapFillRowSelector(
              row.twapOrder.providerId,
              row.twapOrder.orderId,
              row.fill.fillId,
            )}
          />
        ))}
        {renderPagination({
          page: visibleFillHistoryPage,
          pageCount: fillHistoryPageCount,
          onPrevious: () => setFillHistoryPage((page) => page - 1),
          onNext: () => setFillHistoryPage((page) => page + 1),
          previousTestID: PerpsProMarketViewSelectorsIDs.TWAP_FILL_PREVIOUS,
          nextTestID: PerpsProMarketViewSelectorsIDs.TWAP_FILL_NEXT,
          pageLabelTestID: PerpsProMarketViewSelectorsIDs.TWAP_FILL_PAGE_LABEL,
        })}
      </Box>
    );
  };

  const renderActiveView = () => {
    if (activeView === 'fill_history') {
      return renderFillHistory();
    }
    if (activeView === 'history') {
      return renderScheduleList(
        visibleHistoricalTwapOrders,
        false,
        renderPagination({
          page: visibleScheduleHistoryPage,
          pageCount: scheduleHistoryPageCount,
          onPrevious: () => setScheduleHistoryPage((page) => page - 1),
          onNext: () => setScheduleHistoryPage((page) => page + 1),
          previousTestID: PerpsProMarketViewSelectorsIDs.TWAP_HISTORY_PREVIOUS,
          nextTestID: PerpsProMarketViewSelectorsIDs.TWAP_HISTORY_NEXT,
          pageLabelTestID:
            PerpsProMarketViewSelectorsIDs.TWAP_HISTORY_PAGE_LABEL,
        }),
      );
    }
    return renderScheduleList(activeTwapOrders, true);
  };

  return (
    <Box>
      <TabsBar
        tabs={viewTabs}
        activeIndex={activeViewIndex}
        onTabPress={setActiveViewIndex}
        twClassName="-mx-2"
        testID={PerpsProMarketViewSelectorsIDs.TWAP_VIEW_TABS}
      />
      {error ? (
        <Box
          twClassName="mx-2 mt-3 gap-2 rounded-xl bg-error-muted p-3"
          testID={PerpsProMarketViewSelectorsIDs.TWAP_ERROR}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('perps.pro_positions_panel.twap_load_error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onRetry}
            isLoading={isRefreshing}
            isDisabled={isRefreshing}
            testID={PerpsProMarketViewSelectorsIDs.TWAP_RETRY}
          >
            {strings('perps.pro_positions_panel.twap_retry')}
          </Button>
        </Box>
      ) : null}
      {renderActiveView()}
    </Box>
  );
};

export default PerpsProTwapPanel;
