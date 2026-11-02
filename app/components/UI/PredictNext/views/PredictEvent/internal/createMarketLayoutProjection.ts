import BigNumber from 'bignumber.js';
import { parsePredictDecimal } from '../../../events/shared/formatting';
import type { PredictMarket, PredictMarketType } from '../../../types';
import {
  hasConsistentLines,
  isMarketSelectorMarket,
} from './marketSelectorGroup';

export type MarketLayoutCard =
  | { type: 'choice'; key: string; markets: readonly PredictMarket[] }
  | {
      type: 'marketSelector';
      key: string;
      marketType: PredictMarketType;
      markets: readonly PredictMarket[];
    }
  | { type: 'standard'; key: string; market: PredictMarket };

export interface MarketLayoutPeriod {
  /** Absent when the section's Markets have no subgroup. */
  key?: string;
  order: number;
  cards: readonly MarketLayoutCard[];
}

export interface MarketLayoutSection {
  key: string;
  order: number;
  /** Decimal string, unformatted. Absent when no Market has a volume. */
  volume?: string;
  periods: readonly MarketLayoutPeriod[];
}

export interface MarketLayoutTab {
  key: string;
  order: number;
  sections: readonly MarketLayoutSection[];
}

export interface MarketLayoutProjection {
  tabs: readonly MarketLayoutTab[];
  /** Markets without layout, in response order. */
  remainingMarkets: readonly PredictMarket[];
}

interface IndexedMarket {
  market: PredictMarket;
  index: number;
}

interface Level<Key, Children> {
  key: Key;
  order: number;
  firstIndex: number;
  children: Children;
}

interface PeriodMarkets {
  groups: Map<string, IndexedMarket[]>;
  ungrouped: IndexedMarket[];
}

type PeriodLevel = Level<string | undefined, PeriodMarkets>;
type SectionLevel = Level<string, Map<string | undefined, PeriodLevel>>;
type TabLevel = Level<string, Map<string, SectionLevel>>;

/** The first order seen for a key wins, like the first position. */
function getLevel<Key, Children>(
  levels: Map<Key, Level<Key, Children>>,
  key: Key,
  order: number,
  index: number,
  createChildren: () => Children,
): Level<Key, Children> {
  const existing = levels.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const level = { key, order, firstIndex: index, children: createChildren() };
  levels.set(key, level);
  return level;
}

const compareLevels = (
  left: Level<unknown, unknown>,
  right: Level<unknown, unknown>,
): number => left.order - right.order || left.firstIndex - right.firstIndex;

const comparePeriods = (left: PeriodLevel, right: PeriodLevel): number =>
  Number(left.key !== undefined) - Number(right.key !== undefined) ||
  compareLevels(left, right);

const compareByDisplayOrder = (
  left: IndexedMarket,
  right: IndexedMarket,
): number =>
  (left.market.group?.displayOrder ?? Number.MAX_SAFE_INTEGER) -
    (right.market.group?.displayOrder ?? Number.MAX_SAFE_INTEGER) ||
  left.index - right.index;

const toStandardCard = ({ market }: IndexedMarket): MarketLayoutCard => ({
  type: 'standard',
  key: `market:${market.id}`,
  market,
});

/** Undefined when the group can't make one card; its Markets stand alone. */
function toGroupCard(
  key: string,
  members: readonly IndexedMarket[],
): MarketLayoutCard | undefined {
  const markets = [...members]
    .sort(compareByDisplayOrder)
    .map(({ market }) => market);

  if (
    markets.length >= 2 &&
    markets.every((market) => market.group?.groupType === 'choice')
  ) {
    return { type: 'choice', key, markets };
  }

  const lines = markets.filter(isMarketSelectorMarket);
  if (lines.length === markets.length && hasConsistentLines(lines)) {
    return {
      type: 'marketSelector',
      key,
      marketType: lines[0].group.marketType,
      markets: lines,
    };
  }

  return undefined;
}

/** Cards in the order their first Market appears in the response. */
function toCards({ groups, ungrouped }: PeriodMarkets): MarketLayoutCard[] {
  const placed = ungrouped.map((member) => ({
    card: toStandardCard(member),
    position: member.index,
  }));

  for (const [key, members] of groups) {
    const card = toGroupCard(key, members);
    if (card === undefined) {
      placed.push(
        ...members.map((member) => ({
          card: toStandardCard(member),
          position: member.index,
        })),
      );
    } else {
      placed.push({ card, position: members[0].index });
    }
  }

  return placed
    .sort((left, right) => left.position - right.position)
    .map(({ card }) => card);
}

function sumVolume(periods: readonly PeriodLevel[]): string | undefined {
  let total: BigNumber | undefined;
  for (const { children } of periods) {
    const members = [
      ...children.ungrouped,
      ...[...children.groups.values()].flat(),
    ];
    for (const { market } of members) {
      const volume = parsePredictDecimal(market.volume);
      if (volume !== undefined) {
        total = (total ?? new BigNumber(0)).plus(volume);
      }
    }
  }
  return total?.toFixed();
}

function toSection(section: SectionLevel): MarketLayoutSection {
  const periods = [...section.children.values()].sort(comparePeriods);
  const volume = sumVolume(periods);
  return {
    key: section.key,
    order: section.order,
    ...(volume === undefined ? {} : { volume }),
    periods: periods.map((period) => ({
      ...(period.key === undefined ? {} : { key: period.key }),
      order: period.order,
      cards: toCards(period.children),
    })),
  };
}

/**
 * Projects an Event's laid-out Markets into tabs › sections › periods › cards.
 * Every key the API sends is kept; the card type follows the group's shape:
 * a `choice` group, a `marketSelector` line picker, or a standard card for a
 * Market without a group or in a group that can't make one card.
 */
export function createMarketLayoutProjection(
  markets: readonly PredictMarket[],
): MarketLayoutProjection {
  const tabs = new Map<string, TabLevel>();
  const remainingMarkets: PredictMarket[] = [];

  markets.forEach((market, index) => {
    const layout = market.layout;
    if (layout === undefined) {
      remainingMarkets.push(market);
      return;
    }

    const tab = getLevel(
      tabs,
      layout.tab.key,
      layout.tab.order,
      index,
      () => new Map<string, SectionLevel>(),
    );
    const section = getLevel(
      tab.children,
      layout.section.key,
      layout.section.order,
      index,
      () => new Map<string | undefined, PeriodLevel>(),
    );
    const period = getLevel(
      section.children,
      layout.subgroup?.key,
      layout.subgroup?.order ?? 0,
      index,
      (): PeriodMarkets => ({ groups: new Map(), ungrouped: [] }),
    );

    const groupKey = market.group?.key.trim();
    if (groupKey === undefined || groupKey.length === 0) {
      period.children.ungrouped.push({ market, index });
      return;
    }
    const members = period.children.groups.get(groupKey) ?? [];
    members.push({ market, index });
    period.children.groups.set(groupKey, members);
  });

  return {
    tabs: [...tabs.values()].sort(compareLevels).map((tab) => ({
      key: tab.key,
      order: tab.order,
      sections: [...tab.children.values()].sort(compareLevels).map(toSection),
    })),
    remainingMarkets,
  };
}
