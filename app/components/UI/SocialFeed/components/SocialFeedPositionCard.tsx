import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useCopyTradeToPerps } from '../hooks/useCopyTradeToPerps';
import { useLiveCardHeader } from '../live/useLiveCardHeader';
import type { SocialV1FeedItem } from '../types';
import { formatFeedPostAge } from '../utils/formatters';
import { isCopyTradeable } from '../utils/copyTrade';
import { getPositionCardMode } from '../utils/positionCardMode';
import CopyTradeButton from './CopyTradeButton';
import FeedPost from './FeedPost';
import PositionCardHeader from './PositionCardHeader';
import PositionCardShell, { type PositionCardTone } from './PositionCardShell';
import PositionCardStats, {
  type PositionCardStatRow,
} from './PositionCardStats';
import {
  getSocialFeedPositionCardCopyTradeTestId,
  getSocialFeedPositionCardStatTestId,
} from './SocialFeedPositionCard.testIds';

export interface SocialFeedPositionCardProps {
  item: SocialV1FeedItem;
  /**
   * Wall-clock instant used to format the post age. Threaded to `FeedPost` so a
   * refresh can recompute every post's label together.
   */
  now?: number;
}

export interface PositionCardBodyProps {
  item: SocialV1FeedItem;
  /**
   * Spot callers receive the feed item so they can open QuickBuy. Perps callers
   * may ignore the argument; the card and post shell pass the handler from
   * `useCopyTradeToPerps`.
   */
  onCopyTrade?: (item: SocialV1FeedItem) => void;
  /**
   * Show the commented layout even when the post has no caption. The composer
   * preview passes `true`; the feed leaves it unset and keeps the derived mode.
   */
  expanded?: boolean;
  /**
   * Set `false` to hide Copy trade on an open card. The composer preview passes
   * it because the trader is posting their own position. Defaults to `true`.
   */
  showCopyTrade?: boolean;
}

const statId = getSocialFeedPositionCardStatTestId;

const marketCapSuffix = () =>
  strings('social_leaderboard.position_sheet.market_cap_suffix');

/**
 * A spot figure quoted as market cap when the fills recorded one (`Entry (MC)`,
 * `$3.7T`), and as a unit price otherwise. Perps never have a market cap.
 */
const priceOrMarketCapRow = (
  key: 'entry' | 'exit',
  id: string,
  priceLabel?: string,
  marketCapLabel?: string,
): PositionCardStatRow => {
  const label = strings(`social_leaderboard.feed.position_card.${key}`);
  return {
    key,
    label: marketCapLabel ? `${label} ${marketCapSuffix()}` : label,
    value: marketCapLabel ?? priceLabel,
    testID: statId(id, key),
  };
};

export const closedAgeLabel = (
  closedAtMs: number | undefined,
  verb: 'closed' | 'sold',
  now: number = Date.now(),
): string | undefined =>
  closedAtMs == null
    ? undefined
    : strings(
        verb === 'sold'
          ? 'social_leaderboard.feed.position_card.sold_ago'
          : 'social_leaderboard.feed.position_card.closed_ago',
        { age: formatFeedPostAge(closedAtMs, now) },
      );

/**
 * Wash hue for the figures the card actually shows as P&L. An open card's
 * `valueLabel` is its current value, so it is not proof of a result. The sign
 * has to be the one on screen: live ticks rewrite the header without rewriting
 * the feed snapshot.
 */
const cardTone = (
  pnlLabel: string,
  pnlValueLabel: string | undefined,
  isPnlPositive: boolean,
): PositionCardTone => {
  if (!pnlLabel && !pnlValueLabel) {
    return 'neutral';
  }
  return isPnlPositive ? 'positive' : 'negative';
};

/**
 * The closed-card stats, identical for perps and spot. Three short values that
 * sit side by side: what it was entered at, what it left at, and what it cost.
 * Hold time and a "Closed" status row are deliberately absent -- the card's own
 * red/green treatment already says the position is settled and which way.
 */
const closedStats = (item: {
  id: string;
  entryPriceLabel?: string;
  entryMarketCapLabel?: string;
  exitPriceLabel?: string;
  exitMarketCapLabel?: string;
  costLabel?: string;
}): PositionCardStatRow[] => [
  priceOrMarketCapRow(
    'entry',
    item.id,
    item.entryPriceLabel,
    item.entryMarketCapLabel,
  ),
  priceOrMarketCapRow(
    'exit',
    item.id,
    item.exitPriceLabel,
    item.exitMarketCapLabel,
  ),
  {
    key: 'cost',
    label: strings('social_leaderboard.feed.position_card.cost'),
    value: item.costLabel,
    testID: statId(item.id, 'cost'),
  },
];

/**
 * The position card that forms the body of a post.
 *
 * Four modes, picked by `getPositionCardMode` from the comment and the
 * open/closed state, or from `expanded` when the composer previews a position
 * before it has a caption. Every mode puts the symbol, a side tag, and the P&L
 * on one row. A commented open card adds the stats and Copy trade. A commented
 * closed card adds entry, exit and cost. A card without a comment stays
 * header-only: a live open card, or a closed card that captions when it
 * settled. Spot quotes entry and exit as market cap when the fills recorded
 * one. Perps quote a price, and a closed spot card drops the side tag. Composer
 * spot shares reuse the open layout and gate Copy trade with `showCopyTrade`.
 *
 * Dark mode washes the card with the P&L hue. A closed card also outlines in
 * that hue, so a win and a loss still read while scrolling past at speed.
 */
export const PositionCardBody: React.FC<PositionCardBodyProps> = ({
  item,
  onCopyTrade,
  expanded = false,
  showCopyTrade = true,
}) => {
  const header = useLiveCardHeader(
    item.id,
    item.variant === 'perpsOpen' ||
      item.variant === 'spotOpen' ||
      item.variant === 'spotShare'
      ? item.live
      : undefined,
    {
      priceLabel: 'markPriceLabel' in item ? item.markPriceLabel : undefined,
      marketCapLabel:
        item.variant === 'spotOpen' ? item.marketCapLabel : undefined,
      pnlLabel: item.pnlLabel,
      pnlValueLabel: item.pnlValueLabel,
      isPnlPositive: item.isPnlPositive,
    },
  );

  const mode = getPositionCardMode(item, { expanded });

  if (
    item.variant === 'perpsOpen' ||
    item.variant === 'spotOpen' ||
    item.variant === 'spotShare'
  ) {
    const { marketCapLabel } = header;
    // Leverage is not a row: it rides in the side tag, next to the direction
    // it qualifies (`40x Short`).
    const stats: PositionCardStatRow[] = [
      priceOrMarketCapRow(
        'entry',
        item.id,
        item.entryPriceLabel,
        item.variant === 'spotOpen' ? item.entryMarketCapLabel : undefined,
      ),
      {
        key: 'holdTime',
        label: strings('social_leaderboard.feed.position_card.hold_time'),
        value: item.holdTimeLabel,
        testID: statId(item.id, 'holdTime'),
      },
      {
        key: 'cost',
        label: strings('social_leaderboard.feed.position_card.cost'),
        value: item.costLabel,
        testID: statId(item.id, 'cost'),
      },
    ];

    const showCopyTradeButton =
      showCopyTrade && mode === 'open' && isCopyTradeable(item);

    return (
      <PositionCardShell
        tone={cardTone(
          header.pnlLabel,
          header.pnlValueLabel,
          header.isPnlPositive,
        )}
        compact={mode === 'openCompact'}
      >
        <View ref={header.trackRef} collapsable={false}>
          <PositionCardHeader
            layout="open"
            avatar={item.asset.avatar}
            symbol={item.asset.symbol}
            direction={
              item.variant === 'perpsOpen' ? item.direction : undefined
            }
            leverageLabel={
              item.variant === 'perpsOpen' ? item.leverageLabel : undefined
            }
            side={item.variant === 'perpsOpen' ? undefined : item.side}
            subtitleLabel={
              marketCapLabel
                ? `${marketCapLabel} ${marketCapSuffix()}`
                : header.priceLabel
            }
            pnlLabel={header.pnlLabel}
            pnlValueLabel={header.pnlValueLabel}
            isPnlPositive={header.isPnlPositive}
            live={header.live}
          />
        </View>
        {mode === 'open' ? (
          <>
            <PositionCardStats rows={stats} cardId={item.id} />
            {showCopyTradeButton ? (
              <CopyTradeButton
                onPress={onCopyTrade ? () => onCopyTrade(item) : undefined}
                testID={getSocialFeedPositionCardCopyTradeTestId(item.id)}
              />
            ) : null}
          </>
        ) : null}
      </PositionCardShell>
    );
  }

  return (
    <PositionCardShell
      tone={cardTone(item.pnlLabel, item.valueLabel, item.isPnlPositive)}
      emphasizeBorder
      compact={mode === 'closedCompact'}
    >
      <PositionCardHeader
        layout="closed"
        avatar={item.asset.avatar}
        symbol={item.asset.symbol}
        direction={item.variant === 'perpsClosed' ? item.direction : undefined}
        leverageLabel={
          item.variant === 'perpsClosed' ? item.leverageLabel : undefined
        }
        subtitleLabel={closedAgeLabel(
          item.closedAtMs,
          item.variant === 'spotClosed' ? 'sold' : 'closed',
        )}
        pnlLabel={item.pnlLabel}
        pnlValueLabel={item.valueLabel}
        isPnlPositive={item.isPnlPositive}
      />
      {mode === 'closed' ? (
        <PositionCardStats
          rows={closedStats(item)}
          cardId={item.id}
          layout="columns"
        />
      ) : null}
    </PositionCardShell>
  );
};

const SocialFeedPositionCard: React.FC<SocialFeedPositionCardProps> = ({
  item,
  now,
}) => {
  const { onCopyTrade, geoBlockSheet } = useCopyTradeToPerps(item);

  return (
    <>
      <FeedPost
        id={item.id}
        author={item.author}
        timestamp={item.timestamp}
        comment={item.comment}
        now={now}
      >
        <PositionCardBody item={item} onCopyTrade={onCopyTrade} />
      </FeedPost>
      {geoBlockSheet}
    </>
  );
};

export default SocialFeedPositionCard;
