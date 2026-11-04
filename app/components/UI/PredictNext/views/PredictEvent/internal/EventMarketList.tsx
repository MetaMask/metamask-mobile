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
import {
  createMarketLayoutProjection,
  type MarketLayoutSection,
} from './createMarketLayoutProjection';
import { EventMarketLayoutSection } from './EventMarketLayoutSection';
import { getMarketLayoutTitle } from './marketLayoutTitles';
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
/** Sections a tab opens on first load, by order. */
const OPEN_SECTION_COUNT = 3;
const POSITIONS_TAB = 'positions';
const MARKETS_TAB = 'markets';

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

type MarketRow =
  | MarketGroupProjection
  | {
      type: 'section';
      /** Unique across tabs; keys the section's UI state. */
      stateKey: string;
      section: MarketLayoutSection;
      index: number;
    };
type ContentRow = MarketRow | { type: 'position'; position: PredictPosition };

/** Sections bring their own divider, so two in a row sit flush. */
const isSeparated = (leadingRow: ContentRow, trailingRow: ContentRow) =>
  !(leadingRow.type === 'section' && trailingRow.type === 'section');

interface MarketTab {
  key: string;
  label: string;
  testID: string;
  rows: readonly MarketRow[];
}

const getRowKey = (row: ContentRow): string => {
  if (row.type === 'position') {
    return JSON.stringify([
      'positions',
      row.position.venueId,
      row.position.marketId,
      row.position.side,
    ]);
  }
  if (row.type === 'section') {
    return `markets:section:${row.stateKey}`;
  }
  return row.type === 'group'
    ? `markets:group:${row.key}`
    : `markets:market:${row.market.id}`;
};

/**
 * One tab per layout tab, with its sections; Markets without layout follow
 * the first tab's sections. Without layout, one Markets tab of flat rows.
 */
const toMarketTabs = (event: PredictEvent): MarketTab[] => {
  const { tabs, remainingMarkets } = createMarketLayoutProjection(
    event.markets,
  );
  const flatRows = createMarketGroupProjection(remainingMarkets);

  if (tabs.length === 0) {
    return flatRows.length === 0
      ? []
      : [
          {
            key: MARKETS_TAB,
            label: strings(
              getEventGame(event)
                ? 'predict_next.event.game_lines'
                : 'predict_next.event.outcomes',
            ),
            testID: EventMarketListTestIds.MARKETS_TAB,
            rows: flatRows,
          },
        ];
  }

  return tabs.map((tab, tabIndex) => ({
    key: `layout:${tab.key}`,
    label: getMarketLayoutTitle(tab.key),
    testID: EventMarketListTestIds.layoutTab(tab.key),
    rows: [
      ...tab.sections.map(
        (section, index): MarketRow => ({
          type: 'section',
          stateKey: JSON.stringify([tab.key, section.key]),
          section,
          index,
        }),
      ),
      ...(tabIndex === 0 ? flatRows : []),
    ],
  }));
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
  // Section state lives here, keyed, so it outlives rows the list unmounts.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [selectedPeriods, setSelectedPeriods] = useState<
    Record<string, string>
  >({});
  const marketTabs = useMemo(() => toMarketTabs(event), [event]);
  let firstTab: string | undefined;
  if (positions.length > 0) {
    firstTab = POSITIONS_TAB;
  } else if (marketTabs.length > 0) {
    firstTab = marketTabs[0].key;
  }
  const [selectedTab, setSelectedTab] = useState<string | undefined>(firstTab);
  const activeTab =
    (selectedTab === POSITIONS_TAB && positions.length > 0) ||
    marketTabs.some((tab) => tab.key === selectedTab)
      ? selectedTab
      : firstTab;

  // Reconcile only an invalid selection, before children render. Late holdings
  // must not override an already-valid Market selection.
  if (selectedTab !== activeTab) {
    setSelectedTab(activeTab);
  }

  const rows = useMemo<readonly ContentRow[]>(
    () =>
      activeTab === POSITIONS_TAB
        ? positions.map((position) => ({ type: 'position', position }))
        : (marketTabs.find((tab) => tab.key === activeTab)?.rows ?? []),
    [activeTab, marketTabs, positions],
  );
  const tabs = [
    ...(positions.length > 0
      ? [
          {
            key: POSITIONS_TAB,
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
    ...marketTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      content: null,
      testID: tab.testID,
    })),
  ];
  const contentContainerStyle = useMemo(() => tw.style('px-4'), [tw]);
  const handleGroupMarketSelect = useCallback(
    (groupKey: string, marketId: PredictMarket['id']) => {
      setSelectedMarketIds((current) => ({ ...current, [groupKey]: marketId }));
    },
    [],
  );
  const handleSectionToggle = useCallback((stateKey: string, open: boolean) => {
    setOpenSections((current) => ({ ...current, [stateKey]: open }));
  }, []);
  const handlePeriodSelect = useCallback(
    (stateKey: string, periodKey: string) => {
      setSelectedPeriods((current) => ({ ...current, [stateKey]: periodKey }));
    },
    [],
  );
  const game = getEventGame(event);
  const extraData = useMemo(
    () => ({ selectedMarketIds, openSections, selectedPeriods }),
    [openSections, selectedMarketIds, selectedPeriods],
  );
  const renderMarket = useCallback(
    (projection: MarketRow) => {
      if (projection.type === 'section') {
        return (
          <EventMarketLayoutSection
            stateKey={projection.stateKey}
            section={projection.section}
            showDivider={projection.index > 0}
            initialOpen={
              openSections[projection.stateKey] ??
              projection.index < OPEN_SECTION_COUNT
            }
            onToggle={handleSectionToggle}
            selectedPeriodKey={selectedPeriods[projection.stateKey]}
            onSelectPeriod={handlePeriodSelect}
            selectedMarketIds={selectedMarketIds}
            onSelectMarket={handleGroupMarketSelect}
            game={game}
            onOrder={onOrder}
            onRulesPress={onRulesPress}
          />
        );
      }

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
        <TotalMarketGroupCard
          {...groupProps}
          title={strings('predict.market_groups.total_points')}
        />
      ) : (
        <SpreadMarketGroupCard
          {...groupProps}
          title={strings('predict.market_groups.spread')}
          game={game}
        />
      );
    },
    [
      game,
      handleGroupMarketSelect,
      handlePeriodSelect,
      handleSectionToggle,
      onOrder,
      onRulesPress,
      openSections,
      selectedMarketIds,
      selectedPeriods,
    ],
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
      extraData={extraData}
      keyExtractor={getRowKey}
      renderItem={renderRow}
      contentContainerStyle={contentContainerStyle}
      isSeparated={isSeparated}
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
