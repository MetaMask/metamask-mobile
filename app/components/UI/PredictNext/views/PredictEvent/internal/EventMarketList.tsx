import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { getEventGame } from '../../../events/game';
import { MarketList } from '../../../events/markets';
import type {
  PredictEvent,
  PredictMarket,
  PredictOutcome,
  PredictPosition,
} from '../../../types';
import { EventPositionCard } from './EventPositionCard';
import {
  createMarketLayoutProjection,
  type MarketLayoutCard,
  type MarketLayoutSection,
} from './createMarketLayoutProjection';
import { projectFlatMarketCards } from './projectFlatMarketCards';
import { EventMarketLayoutCard } from './EventMarketLayoutCard';
import { EventMarketLayoutSectionTestIds } from './EventMarketLayoutSection.testIds';
import {
  EventMarketLayoutSectionHeader,
  periodKeyOf,
  UNKEYED_PERIOD,
} from './EventMarketLayoutSectionHeader';
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
/** Cards a section shows before "View all N markets". */
const COLLAPSED_CARD_COUNT = 3;
const POSITIONS_TAB = 'positions';

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
  | MarketLayoutCard
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
  flatCards: readonly MarketLayoutCard[];
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
  return row.type === 'standard'
    ? `markets:market:${row.market.id}`
    : `markets:group:${row.key}`;
};

/**
 * One tab per layout tab, with its sections; Markets without layout follow
 * the first tab's sections. Without layout, one Markets tab of flat rows.
 */
const toMarketTabs = (event: PredictEvent): MarketTab[] => {
  const { tabs, remainingMarkets } = createMarketLayoutProjection(
    event.markets,
  );
  const flatCards = projectFlatMarketCards(remainingMarkets);

  if (tabs.length === 0) {
    return flatCards.length === 0
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
            flatCards,
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
    flatCards: tabIndex === 0 ? flatCards : [],
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
          ...tab.flatCards,
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
      const renderCard = (card: MarketLayoutCard) => (
        <EventMarketLayoutCard
          card={card}
          game={game}
          selectedMarketId={
            card.type === 'standard' ? undefined : selectedMarketIds[card.key]
          }
          onSelectMarket={handleGroupMarketSelect}
          onOrder={onOrder}
          onRulesPress={onRulesPress}
        />
      );

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
            {renderCard(card)}
          </Box>
        );
      }

      return renderCard(projection);
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
