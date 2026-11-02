import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { BadgeCount, Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TabsBar from '../../../../../../component-library/components-temp/Tabs/TabsBar';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import { strings } from '../../../../../../../locales/i18n';
import { PREDICT_MARKET_TYPES } from '../../../constants';
import { getEventGame } from '../../../events/game';
import {
  MarketList,
  MarketStandardCard,
  SpreadMarketGroupCard,
  TotalMarketGroupCard,
} from '../../../events/markets';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
} from '../../../types';
import { EventPositionRow } from './EventPositionRow';
import {
  createMarketGroupProjection,
  type MarketGroupProjection,
} from './createMarketGroupProjection';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import { useEventPositions } from './useEventPositions';

const MAX_BADGE_COUNT = 99;
const DEFAULT_LIST_WINDOW = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 21,
};
const LOW_HARDWARE_LIST_WINDOW = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  windowSize: 5,
};

export interface EventMarketListProps {
  /** The current canonical Event, including any live-projected Markets. */
  event: PredictEvent;
  /** Expresses buy intent; the caller owns the Order workflow. */
  onOrder: (market: PredictMarket, outcome: PredictOutcome) => void;
  /** Requests the displayed Market's rules from the existing sheet owner. */
  onRulesPress: (market: PredictMarket) => void;
  /** Expresses Cash Out intent for one canonical Position. */
  onCashOut: (position: PredictPosition) => void;
  /** Static header content above the tabs in the same scrolling surface. */
  children?: ReactNode;
  /** Overrides the virtualized list's root test ID. */
  testID?: string;
}

type ContentTab = 'positions' | 'markets';
type ContentRow =
  | MarketGroupProjection
  | { type: 'position'; position: PredictPosition };

const getRowKey = (row: ContentRow): string => {
  if (row.type === 'position') {
    return JSON.stringify([
      'positions',
      row.position.venueId,
      row.position.marketId,
      row.position.side,
    ]);
  }
  return row.type === 'group'
    ? `markets:group:${row.key}`
    : `markets:market:${row.market.id}`;
};

const EventMarketListContent = ({
  event,
  onOrder,
  onRulesPress,
  onCashOut,
  children,
  testID = EventMarketListTestIds.ROOT,
}: EventMarketListProps) => {
  const tw = useTailwind();
  const networkTier = useNetworkTier();
  // Unknown transport keeps the default window, including on LOW hardware.
  const listWindow =
    getHardwareTier() === 'LOW' && networkTier !== null
      ? LOW_HARDWARE_LIST_WINDOW
      : DEFAULT_LIST_WINDOW;
  const positions = useEventPositions(event);
  const isPrivacyMode = useSelector(selectPrivacyMode);
  const [selectedMarketIds, setSelectedMarketIds] = useState<
    Record<string, PredictMarket['id']>
  >({});
  const markets = useMemo(
    () => createMarketGroupProjection(event.markets),
    [event.markets],
  );
  let firstTab: ContentTab | undefined;
  if (positions.length > 0) {
    firstTab = 'positions';
  } else if (markets.length > 0) {
    firstTab = 'markets';
  }
  const [selectedTab, setSelectedTab] = useState<ContentTab | undefined>(
    firstTab,
  );
  const activeTab =
    (selectedTab === 'positions' && positions.length > 0) ||
    (selectedTab === 'markets' && markets.length > 0)
      ? selectedTab
      : firstTab;

  // Reconcile only an invalid selection, before children render. Late holdings
  // must not override an already-valid Market selection.
  if (selectedTab !== activeTab) {
    setSelectedTab(activeTab);
  }

  const rows = useMemo<readonly ContentRow[]>(
    () =>
      activeTab === 'positions'
        ? positions.map((position) => ({ type: 'position', position }))
        : markets,
    [activeTab, markets, positions],
  );
  const tabs = [
    ...(positions.length > 0
      ? [
          {
            key: 'positions' as const,
            label: strings('predict_next.portfolio.positions'),
            content: null,
            testID: EventMarketListTestIds.POSITIONS_TAB,
            endAccessory: (
              <BadgeCount
                count={positions.length}
                max={MAX_BADGE_COUNT}
                twClassName="relative -top-px -ml-2 h-auto min-h-3 min-w-3 rounded bg-error-default-hover px-0.5"
                textProps={{ twClassName: 'text-[10px] leading-[12px]' }}
              />
            ),
          },
        ]
      : []),
    ...(markets.length > 0
      ? [
          {
            key: 'markets' as const,
            label: strings(
              getEventGame(event)
                ? 'predict_next.event.game_lines'
                : 'predict_next.event.outcomes',
            ),
            content: null,
            testID: EventMarketListTestIds.MARKETS_TAB,
          },
        ]
      : []),
  ];
  const contentContainerStyle = useMemo(() => tw.style('px-4'), [tw]);
  const handleGroupMarketSelect = useCallback(
    (groupKey: string, marketId: PredictMarket['id']) => {
      setSelectedMarketIds((current) => ({ ...current, [groupKey]: marketId }));
    },
    [],
  );
  const renderMarket = useCallback(
    (projection: MarketGroupProjection) => {
      if (projection.type === 'standard') {
        return (
          <MarketStandardCard
            market={projection.market}
            onOrder={onOrder}
            onRulesPress={onRulesPress}
          />
        );
      }

      const selectedMarket =
        projection.markets.find(
          (market) => market.id === selectedMarketIds[projection.key],
        ) ?? projection.markets[0];
      if (!selectedMarket) {
        return null;
      }

      const groupProps = {
        groupKey: projection.key,
        markets: projection.markets,
        selectedMarket,
        onSelectMarket: (marketId: PredictMarket['id']) =>
          handleGroupMarketSelect(projection.key, marketId),
        onOrder,
        onRulesPress,
      };

      return projection.marketType === PREDICT_MARKET_TYPES.TOTAL ? (
        <TotalMarketGroupCard {...groupProps} />
      ) : (
        <SpreadMarketGroupCard {...groupProps} />
      );
    },
    [handleGroupMarketSelect, onOrder, onRulesPress, selectedMarketIds],
  );
  const renderRow = useCallback(
    (row: ContentRow) =>
      row.type === 'position' ? (
        <EventPositionRow
          position={row.position}
          isPrivacyMode={isPrivacyMode}
          onCashOut={onCashOut}
          testID={EventMarketListTestIds.positionRow(
            row.position.marketId,
            row.position.side,
          )}
          cashOutTestID={EventMarketListTestIds.positionCashOut(
            row.position.marketId,
            row.position.side,
          )}
        />
      ) : (
        renderMarket(row)
      ),
    [isPrivacyMode, onCashOut, renderMarket],
  );

  return (
    <MarketList
      {...listWindow}
      testID={testID}
      data={rows}
      extraData={selectedMarketIds}
      keyExtractor={getRowKey}
      renderItem={renderRow}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={
        <Box>
          {children}
          {tabs.length > 0 ? (
            <TabsBar
              testID={EventMarketListTestIds.TABS}
              twClassName="-mx-4 mb-4"
              tabs={tabs}
              activeIndex={tabs.findIndex((tab) => tab.key === activeTab)}
              onTabPress={(index) => setSelectedTab(tabs[index].key)}
            />
          ) : null}
        </Box>
      }
    />
  );
};

/** Owns Event content while leaving charts, navigation, and workflows outside. */
export const EventMarketList = (props: EventMarketListProps) => (
  <EventMarketListContent
    key={JSON.stringify([props.event.venueId, props.event.id])}
    {...props}
  />
);
