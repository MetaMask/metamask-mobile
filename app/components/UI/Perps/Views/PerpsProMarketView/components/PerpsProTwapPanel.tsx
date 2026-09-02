import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import React, { useEffect, useMemo, useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import type { TabItem } from '../../../../../../component-library/components-temp/Tabs/TabsBar/TabsBar.types';
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
  selectTwapFillRows,
  type ProTwapView,
} from '../utils/proTwapViews';

const FILL_HISTORY_PAGE_SIZE = 50;

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
  terminatingOrderId: string | null;
  /** Load failure from the most recent REST read. */
  error: string | null;
  onRetry: () => void;
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
  terminatingOrderId,
  error,
  onRetry,
  emptyMetadataByView,
}: PerpsProTwapPanelProps) => {
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [fillHistoryPage, setFillHistoryPage] = useState(0);
  const activeView = PRO_TWAP_VIEWS[activeViewIndex] ?? 'active';

  const fillRows = useMemo(
    () => selectTwapFillRows([...activeTwapOrders, ...historicalTwapOrders]),
    [activeTwapOrders, historicalTwapOrders],
  );
  const fillHistoryPageCount = Math.max(
    1,
    Math.ceil(fillRows.length / FILL_HISTORY_PAGE_SIZE),
  );
  const visibleFillRows = fillRows.slice(
    fillHistoryPage * FILL_HISTORY_PAGE_SIZE,
    (fillHistoryPage + 1) * FILL_HISTORY_PAGE_SIZE,
  );

  useEffect(() => {
    setFillHistoryPage((currentPage) =>
      Math.min(currentPage, fillHistoryPageCount - 1),
    );
  }, [fillHistoryPageCount]);

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
    // Avoid flashing the empty state while the first fetch is still pending.
    if (isInitialLoading || error) {
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
  ) => {
    if (twapOrders.length === 0) {
      return renderEmptyState();
    }

    return (
      <Box testID={PerpsProMarketViewSelectorsIDs.TWAP_LIST}>
        {twapOrders.map((twapOrder) => (
          <PerpsProTwapCard
            key={twapOrder.orderId}
            twapOrder={twapOrder}
            testID={getPerpsProTwapRowSelector(twapOrder.orderId)}
            onPress={onSelectMarket}
            onTerminate={isActiveView ? onTerminate : undefined}
            isTerminateDisabled={terminatingOrderId !== null}
          />
        ))}
      </Box>
    );
  };

  const renderFillHistory = () => {
    if (fillRows.length === 0) {
      return renderEmptyState();
    }

    return (
      <Box testID={PerpsProMarketViewSelectorsIDs.TWAP_LIST}>
        {visibleFillRows.map((row) => (
          <PerpsProTwapFillRowItem
            key={row.fill.fillId}
            row={row}
            testID={getPerpsProTwapFillRowSelector(row.fill.fillId)}
          />
        ))}
        {fillHistoryPageCount > 1 ? (
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 px-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              twClassName="flex-1"
              isDisabled={fillHistoryPage === 0}
              onPress={() => setFillHistoryPage((page) => page - 1)}
              testID={PerpsProMarketViewSelectorsIDs.TWAP_FILL_PREVIOUS}
            >
              {strings('perps.pro_positions_panel.twap_views.previous_fills')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              twClassName="flex-1"
              isDisabled={fillHistoryPage >= fillHistoryPageCount - 1}
              onPress={() => setFillHistoryPage((page) => page + 1)}
              testID={PerpsProMarketViewSelectorsIDs.TWAP_FILL_NEXT}
            >
              {strings('perps.pro_positions_panel.twap_views.next_fills')}
            </Button>
          </Box>
        ) : null}
      </Box>
    );
  };

  const renderActiveView = () => {
    if (activeView === 'fill_history') {
      return renderFillHistory();
    }
    if (activeView === 'history') {
      return renderScheduleList(historicalTwapOrders, false);
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
