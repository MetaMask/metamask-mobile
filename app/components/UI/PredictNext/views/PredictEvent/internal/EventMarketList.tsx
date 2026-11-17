import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ViewToken } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BadgeCount,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
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
import { EventPositionCard } from './EventPositionCard';
import {
  createMarketGroupProjection,
  type MarketGroupProjection,
} from './createMarketGroupProjection';
import {
  createMarketLayoutProjection,
  type MarketLayoutCard,
  type MarketLayoutSection,
} from './createMarketLayoutProjection';
import {
  EventMarketLayoutCard,
  getLayoutCardMarketIds,
} from './EventMarketLayoutCard';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import {
  EventMarketLayoutSectionHeader,
  periodKeyOf,
  UNKEYED_PERIOD,
} from './EventMarketLayoutSectionHeader';
import { getMarketLayoutTitle } from './marketLayoutTitles';
import { EventMarketListTestIds } from './EventMarketList.testIds';
import { useEventPositions } from './useEventPositions';
import { TOP_CHART_MARKET_LIMIT } from './selectTopChartMarkets';

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
/** Cards a section shows before "View all N markets". */
const COLLAPSED_CARD_COUNT = 3;
const POSITIONS_TAB = 'positions';
/**
 * Most Market ids the list asks live prices for. The live-data connection
 * holds 250 Markets unless the gateway's `welcome` says otherwise
 * (`PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION`), and it keeps ids
 * past the cap waiting rather than live. The header chart takes up to
 * {@link TOP_CHART_MARKET_LIMIT} more, so the list stays within the rest.
 */
export const EVENT_LIST_LIVE_MARKET_BUDGET = 250 - TOP_CHART_MARKET_LIMIT;
/**
 * Rows kept live on each side of the viewable rows when the active tab is
 * over {@link EVENT_LIST_LIVE_MARKET_BUDGET}, so a short scroll lands on rows
 * that are already live.
 */
const LIVE_ROW_BUFFER = 10;
/** A row counts as viewable once a tenth of it is on screen, as on the Feed. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 10 };

const positionCardTestIds = ({ marketId, side }: PredictPosition) => ({
  root: EventMarketListTestIds.positionRow(marketId, side),
  value: EventMarketListTestIds.positionValue(marketId, side),
  pnl: EventMarketListTestIds.positionPnl(marketId, side),
  chance: EventMarketListTestIds.positionChance(marketId, side),
  buy: EventMarketListTestIds.positionBuy(marketId, side),
  cashOut: EventMarketListTestIds.positionCashOut(marketId, side),
});
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
  /**
   * Reports the Market ids the list renders in its current state, whenever
   * that set changes: the active tab only, open sections only, the selected
   * period of each, and the selected line of each line picker. The caller
   * holds live prices for exactly these. When the tab prices more than
   * {@link EVENT_LIST_LIVE_MARKET_BUDGET} Markets, only the viewable rows and
   * a bounded buffer around them are reported, and the set follows the
   * scroll position.
   */
  onVisibleMarketIdsChange?: (
    marketIds: readonly PredictMarket['id'][],
  ) => void;
  /** Static header content above the tabs in the same scrolling surface. */
  children?: ReactNode;
  /** Overrides the virtualized list's root test ID. */
  testID?: string;
}

/** A laid-out section of a tab, before its UI state is applied. */
interface SectionEntry {
  /** Unique across tabs; keys the section's UI state. */
  stateKey: string;
  section: MarketLayoutSection;
  index: number;
}

type SectionRow =
  | {
      type: 'sectionHeader';
      stateKey: string;
      section: MarketLayoutSection;
      index: number;
      open: boolean;
      selectedPeriodKey: string;
    }
  | {
      type: 'sectionCard';
      stateKey: string;
      sectionKey: string;
      card: MarketLayoutCard;
      /** Space above the card: after another card, or below period chips. */
      spaced: boolean;
    }
  | {
      type: 'sectionViewAll';
      stateKey: string;
      sectionKey: string;
      periodKey: string;
      /** Every Market of the section's period, shown or not. */
      marketCount: number;
    };
type ContentRow =
  | MarketGroupProjection
  | SectionRow
  | { type: 'position'; position: PredictPosition };

const isSectionRow = (row: ContentRow): row is SectionRow =>
  row.type === 'sectionHeader' ||
  row.type === 'sectionCard' ||
  row.type === 'sectionViewAll';

/** UI state of a tab's sections, keyed by section state key. */
interface SectionState {
  openSections: Readonly<Record<string, boolean>>;
  selectedPeriods: Readonly<Record<string, string>>;
  /** Period keys expanded past the first cards, by section. */
  expandedSections: Readonly<Record<string, readonly string[]>>;
}

const countMarkets = (cards: readonly MarketLayoutCard[]): number =>
  cards.reduce(
    (count, card) =>
      count + (card.type === 'standard' ? 1 : card.markets.length),
    0,
  );

/**
 * Section rows space themselves: headers bring their divider and cards their
 * gap, so only the rows around them get the list gap.
 */
const isSeparated = (leadingRow: ContentRow, trailingRow: ContentRow) =>
  !(isSectionRow(leadingRow) && isSectionRow(trailingRow));

interface MarketTab {
  key: string;
  label: string;
  testID: string;
  sections: readonly SectionEntry[];
  flatRows: readonly MarketGroupProjection[];
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
  if (row.type === 'sectionHeader') {
    return `markets:section:${row.stateKey}`;
  }
  if (row.type === 'sectionCard') {
    return `markets:card:${row.stateKey}:${row.card.key}`;
  }
  if (row.type === 'sectionViewAll') {
    return `markets:view-all:${row.stateKey}`;
  }
  return row.type === 'group'
    ? `markets:group:${row.key}`
    : `markets:market:${row.market.id}`;
};

/**
 * Market ids one row prices. Section headers and "View all" rows price
 * nothing; a closed section or an unselected period has no card rows at all.
 */
const getRowMarketIds = (
  row: ContentRow,
  selectedMarketIds: Readonly<Record<string, PredictMarket['id']>>,
): readonly PredictMarket['id'][] => {
  switch (row.type) {
    case 'position':
      return [row.position.marketId];
    case 'sectionCard':
      return getLayoutCardMarketIds(row.card, selectedMarketIds[row.card.key]);
    case 'standard':
      return [row.market.id];
    case 'group': {
      const selectedMarket =
        row.markets.find(
          (market) => market.id === selectedMarketIds[row.key],
        ) ?? row.markets[0];
      return selectedMarket ? [selectedMarket.id] : [];
    }
    default:
      return [];
  }
};

/** Market ids the given rows price, each once, in row order. */
const getRowsMarketIds = (
  rows: readonly ContentRow[],
  selectedMarketIds: Readonly<Record<string, PredictMarket['id']>>,
): PredictMarket['id'][] => [
  ...new Set(rows.flatMap((row) => getRowMarketIds(row, selectedMarketIds))),
];

/**
 * Row indexes nearest first: the viewable range, then the buffer rows
 * alternating below and above it. Until the list reports what is viewable
 * (or when none of the reported rows is in the current tab) the first rows it
 * renders stand in.
 */
const getLiveRowOrder = (
  rows: readonly ContentRow[],
  viewableRowKeys: readonly string[],
  initialNumToRender: number,
): number[] => {
  const viewable = new Set(viewableRowKeys);
  const viewableIndexes = rows.flatMap((row, index) =>
    viewable.has(getRowKey(row)) ? [index] : [],
  );
  const first = viewableIndexes.length > 0 ? Math.min(...viewableIndexes) : 0;
  const last =
    viewableIndexes.length > 0
      ? Math.max(...viewableIndexes)
      : Math.min(rows.length, initialNumToRender) - 1;
  const order: number[] = [];
  for (let index = first; index <= last; index += 1) {
    order.push(index);
  }
  for (let step = 1; step <= LIVE_ROW_BUFFER; step += 1) {
    if (last + step < rows.length) order.push(last + step);
    if (first - step >= 0) order.push(first - step);
  }
  return order;
};

/**
 * Market ids the list holds live prices for. A tab within
 * {@link EVENT_LIST_LIVE_MARKET_BUDGET} keeps every row it renders live, so
 * scrolling never re-scopes. A larger tab (a long flat Event, an expanded
 * section, choice cards with many rows) keeps only the viewable rows and
 * {@link LIVE_ROW_BUFFER} rows around them, nearest first, cut at the budget,
 * so scrolling to a row past the connection cap releases the rows it left.
 */
const getLiveMarketIds = (
  rows: readonly ContentRow[],
  selectedMarketIds: Readonly<Record<string, PredictMarket['id']>>,
  viewableRowKeys: readonly string[],
  initialNumToRender: number,
): PredictMarket['id'][] => {
  const liveRows = getLiveRowOrder(
    rows,
    viewableRowKeys,
    initialNumToRender,
  ).map((index) => rows[index]);
  return getRowsMarketIds(liveRows, selectedMarketIds).slice(
    0,
    EVENT_LIST_LIVE_MARKET_BUDGET,
  );
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
            sections: [],
            flatRows,
          },
        ];
  }

  return tabs.map((tab, tabIndex) => ({
    key: `layout:${tab.key}`,
    label: getMarketLayoutTitle(tab.key),
    testID: EventMarketListTestIds.layoutTab(tab.key),
    sections: tab.sections.map((section, index) => ({
      stateKey: JSON.stringify([tab.key, section.key]),
      section,
      index,
    })),
    flatRows: tabIndex === 0 ? flatRows : [],
  }));
};

/**
 * A section's header row, then a row per card of its selected period while
 * open, so the list only mounts the cards on screen. Past the first cards, a
 * "View all" row stands in for the rest until the section is expanded.
 */
const toSectionRows = (
  { stateKey, section, index }: SectionEntry,
  { openSections, selectedPeriods, expandedSections }: SectionState,
): SectionRow[] => {
  const open = openSections[stateKey] ?? index < OPEN_SECTION_COUNT;
  const period =
    section.periods.find(
      (candidate) => periodKeyOf(candidate) === selectedPeriods[stateKey],
    ) ?? section.periods[0];
  const periodKey = period ? periodKeyOf(period) : UNKEYED_PERIOD;
  const hasChips = section.periods.length > 1;
  const periodCards = open && period ? period.cards : [];
  const isCollapsed =
    periodCards.length > COLLAPSED_CARD_COUNT &&
    !expandedSections[stateKey]?.includes(periodKey);
  const cards = isCollapsed
    ? periodCards.slice(0, COLLAPSED_CARD_COUNT)
    : periodCards;

  return [
    {
      type: 'sectionHeader',
      stateKey,
      section,
      index,
      open,
      selectedPeriodKey: periodKey,
    },
    ...cards.map(
      (card, cardIndex): SectionRow => ({
        type: 'sectionCard',
        stateKey,
        sectionKey: section.key,
        card,
        spaced: cardIndex > 0 || hasChips,
      }),
    ),
    ...(isCollapsed
      ? [
          {
            type: 'sectionViewAll' as const,
            stateKey,
            sectionKey: section.key,
            periodKey,
            marketCount: countMarkets(periodCards),
          },
        ]
      : []),
  ];
};

const EventMarketListContent = ({
  event,
  onOrder,
  onRulesPress,
  onCashOut,
  onVisibleMarketIdsChange,
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
  const [expandedSections, setExpandedSections] = useState<
    Record<string, readonly string[]>
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

  const rows = useMemo<readonly ContentRow[]>(() => {
    if (activeTab === POSITIONS_TAB) {
      return positions.map((position) => ({ type: 'position', position }));
    }
    const tab = marketTabs.find((candidate) => candidate.key === activeTab);
    return tab
      ? [
          ...tab.sections.flatMap((entry) =>
            toSectionRows(entry, {
              openSections,
              selectedPeriods,
              expandedSections,
            }),
          ),
          ...tab.flatRows,
        ]
      : [];
  }, [
    activeTab,
    expandedSections,
    marketTabs,
    openSections,
    positions,
    selectedPeriods,
  ]);
  const rowsMarketIds = getRowsMarketIds(rows, selectedMarketIds);
  const isOverLiveBudget = rowsMarketIds.length > EVENT_LIST_LIVE_MARKET_BUDGET;
  // Row keys the list last reported viewable. Every report lands in the ref;
  // only a tab over the live budget also re-renders on it, since only that
  // tab's live set depends on the scroll position.
  const viewableRowKeysRef = useRef<readonly string[]>([]);
  const isOverLiveBudgetRef = useRef(isOverLiveBudget);
  const [viewableRowKeys, setViewableRowKeys] = useState<readonly string[]>([]);
  // A tab that grows past the budget (View all, a refresh) picks up the rows
  // reported while it was within it.
  useEffect(() => {
    isOverLiveBudgetRef.current = isOverLiveBudget;
    if (isOverLiveBudget) {
      setViewableRowKeys(viewableRowKeysRef.current);
    }
  }, [isOverLiveBudget]);
  // FlatList rejects a changing callback, so this one only stores row keys.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const keys = viewableItems.flatMap((token) =>
        token.item ? [getRowKey(token.item as ContentRow)] : [],
      );
      // A fling or bounce can report nothing; keep the last measured rows.
      if (keys.length === 0) {
        return;
      }
      viewableRowKeysRef.current = keys;
      if (!isOverLiveBudgetRef.current) {
        return;
      }
      setViewableRowKeys((current) =>
        JSON.stringify(current) === JSON.stringify(keys) ? current : keys,
      );
    },
  ).current;
  // Keyed by content: a live tick rebuilds the rows without changing which
  // Markets they price, and each report re-renders the caller.
  const visibleMarketKey = JSON.stringify(
    isOverLiveBudget
      ? getLiveMarketIds(
          rows,
          selectedMarketIds,
          viewableRowKeys,
          listWindow.initialNumToRender,
        )
      : rowsMarketIds,
  );
  useEffect(() => {
    onVisibleMarketIdsChange?.(
      JSON.parse(visibleMarketKey) as PredictMarket['id'][],
    );
  }, [onVisibleMarketIdsChange, visibleMarketKey]);
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
    // Closing a section folds it back to its first cards.
    if (!open) {
      setExpandedSections(({ [stateKey]: _closed, ...rest }) => rest);
    }
  }, []);
  const handleViewAll = useCallback((stateKey: string, periodKey: string) => {
    setExpandedSections((current) => ({
      ...current,
      [stateKey]: [...(current[stateKey] ?? []), periodKey],
    }));
  }, []);
  const handlePeriodSelect = useCallback(
    (stateKey: string, periodKey: string) => {
      setSelectedPeriods((current) => ({ ...current, [stateKey]: periodKey }));
    },
    [],
  );
  const game = getEventGame(event);
  const marketsById = useMemo(
    () => new Map(event.markets.map((market) => [market.id, market])),
    [event.markets],
  );
  const renderMarket = useCallback(
    (projection: Exclude<ContentRow, { type: 'position' }>) => {
      if (projection.type === 'sectionHeader') {
        return (
          <EventMarketLayoutSectionHeader
            stateKey={projection.stateKey}
            section={projection.section}
            showDivider={projection.index > 0}
            open={projection.open}
            onToggle={handleSectionToggle}
            selectedPeriodKey={projection.selectedPeriodKey}
            onSelectPeriod={handlePeriodSelect}
          />
        );
      }

      if (projection.type === 'sectionViewAll') {
        return (
          <Box twClassName="pt-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={() =>
                handleViewAll(projection.stateKey, projection.periodKey)
              }
              testID={EventMarketLayoutSectionTestIds.viewAll(
                projection.sectionKey,
              )}
            >
              {strings('predict_next.event.view_all_markets', {
                count: projection.marketCount,
              })}
            </Button>
          </Box>
        );
      }

      if (projection.type === 'sectionCard') {
        const { card } = projection;
        // A card can render several standard cards; gap spaces them.
        return (
          <Box
            twClassName={projection.spaced ? 'gap-3 pt-3' : 'gap-3'}
            testID={EventMarketLayoutSectionTestIds.card(
              projection.sectionKey,
              card.key,
            )}
          >
            <EventMarketLayoutCard
              card={card}
              game={game}
              selectedMarketId={
                card.type === 'standard'
                  ? undefined
                  : selectedMarketIds[card.key]
              }
              onSelectMarket={handleGroupMarketSelect}
              onOrder={onOrder}
              onRulesPress={onRulesPress}
            />
          </Box>
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
      handleViewAll,
      onOrder,
      onRulesPress,
      selectedMarketIds,
    ],
  );
  const renderRow = useCallback(
    (row: ContentRow) =>
      row.type === 'position' ? (
        <EventPositionCard
          position={row.position}
          market={marketsById.get(row.position.marketId)}
          game={game}
          isPrivacyMode={isPrivacyMode}
          onOrder={onOrder}
          onCashOut={onCashOut}
          testIds={positionCardTestIds(row.position)}
        />
      ) : (
        renderMarket(row)
      ),
    [game, isPrivacyMode, marketsById, onCashOut, onOrder, renderMarket],
  );

  return (
    <MarketList
      {...listWindow}
      testID={testID}
      data={rows}
      extraData={selectedMarketIds}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={VIEWABILITY_CONFIG}
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
