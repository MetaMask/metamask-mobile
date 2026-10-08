import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { useCopyTradeToPerps } from '../hooks/useCopyTradeToPerps';
import { useSocialFeedSurface } from '../SocialFeedSurface';
import type { SocialV1FeedItem } from '../types';
import { mockedFieldLabel } from '../utils/mockedFieldLabel';
import { isCopyTradeable } from '../utils/copyTrade';
import CopyTradeButton from './CopyTradeButton';
import FeedPost from './FeedPost';
import PositionCardHeader from './PositionCardHeader';
import PositionCardShell from './PositionCardShell';
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
  /** Set for an open perp. Spot copy trade stays unwired. */
  onCopyTrade?: () => void;
}

const statId = getSocialFeedPositionCardStatTestId;

/**
 * The closed-card stats, identical for perps and spot. Three short values that
 * sit side by side: what it was entered at, what it left at, and what it cost.
 * Hold time and a "Closed" status row are deliberately absent -- the card's own
 * red/green treatment already says the position is settled and which way.
 */
const closedStats = (item: {
  id: string;
  entryPriceLabel?: string;
  exitPriceLabel?: string;
  costLabel?: string;
}): PositionCardStatRow[] => [
  {
    key: 'entry',
    label: strings('social_leaderboard.feed.position_card.entry'),
    value: item.entryPriceLabel,
    testID: statId(item.id, 'entry'),
  },
  {
    key: 'exit',
    label: strings('social_leaderboard.feed.position_card.exit'),
    value: item.exitPriceLabel,
    testID: statId(item.id, 'exit'),
  },
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
 * Two shapes, not four: an open position puts its running P&L beside the title
 * and offers Copy trade, a closed one puts its settled result under the title and
 * offers nothing to copy. The asset class only decides which stat rows sit
 * between -- perps carry the auto-close bracket, spot carries hold time.
 * Composer spot shares reuse the open layout and gate Copy trade with
 * `showCopyTrade`.
 *
 * A closed card also takes the tone of its realized P&L, so a win and a loss
 * are distinguishable while scrolling past at speed.
 */
export const PositionCardBody: React.FC<PositionCardBodyProps> = ({
  item,
  onCopyTrade,
}) => {
  const { showMockedFields } = useSocialFeedSurface();
  const autoCloseLabel = mockedFieldLabel(
    item.variant === 'perpsOpen' ? item.autoCloseLabel : undefined,
    'autoClose',
    item.mockedFields,
    showMockedFields,
  );
  const markPriceLabel = mockedFieldLabel(
    'markPriceLabel' in item ? item.markPriceLabel : undefined,
    'markPrice',
    item.mockedFields,
    showMockedFields,
  );

  if (
    item.variant === 'perpsOpen' ||
    item.variant === 'spotOpen' ||
    item.variant === 'spotShare'
  ) {
    const entryRow: PositionCardStatRow = {
      key: 'entry',
      label: strings('social_leaderboard.feed.position_card.entry_price'),
      value: item.entryPriceLabel,
      testID: statId(item.id, 'entry'),
    };
    const costRow: PositionCardStatRow = {
      key: 'cost',
      label: strings('social_leaderboard.feed.position_card.cost'),
      value: item.costLabel,
      testID: statId(item.id, 'cost'),
    };
    // Leverage is not a row: it rides in the title, next to the direction it
    // qualifies (`BTC · 40x Short`).
    const stats: PositionCardStatRow[] =
      item.variant === 'perpsOpen'
        ? [
            entryRow,
            {
              key: 'autoClose',
              label: strings(
                'social_leaderboard.feed.position_card.auto_close',
              ),
              value: autoCloseLabel,
              testID: statId(item.id, 'autoClose'),
            },
            costRow,
          ]
        : [
            entryRow,
            {
              key: 'holdTime',
              label: strings('social_leaderboard.feed.position_card.hold_time'),
              value: item.holdTimeLabel,
              testID: statId(item.id, 'holdTime'),
            },
            costRow,
          ];

    const showCopyTrade = isCopyTradeable(item);

    return (
      <PositionCardShell>
        <PositionCardHeader
          layout="open"
          avatar={item.asset.avatar}
          symbol={item.asset.symbol}
          direction={item.variant === 'perpsOpen' ? item.direction : undefined}
          leverageLabel={
            item.variant === 'perpsOpen' ? item.leverageLabel : undefined
          }
          side={item.variant === 'perpsOpen' ? undefined : item.side}
          markPriceLabel={markPriceLabel}
          valueLabel={item.valueLabel}
          pnlLabel={item.pnlLabel}
          pnlValueLabel={item.pnlValueLabel}
          isPnlPositive={item.isPnlPositive}
        />
        <PositionCardStats rows={stats} cardId={item.id} />
        {showCopyTrade ? (
          <CopyTradeButton
            onPress={onCopyTrade}
            testID={getSocialFeedPositionCardCopyTradeTestId(item.id)}
          />
        ) : null}
      </PositionCardShell>
    );
  }

  return (
    <PositionCardShell tone={item.isPnlPositive ? 'positive' : 'negative'}>
      <PositionCardHeader
        layout="closed"
        avatar={item.asset.avatar}
        symbol={item.asset.symbol}
        direction={item.variant === 'perpsClosed' ? item.direction : undefined}
        side={item.variant === 'spotClosed' ? item.side : undefined}
        leverageLabel={
          item.variant === 'perpsClosed' ? item.leverageLabel : undefined
        }
        valueLabel={item.valueLabel}
        pnlLabel={item.pnlLabel}
        isPnlPositive={item.isPnlPositive}
      />
      <PositionCardStats
        rows={closedStats(item)}
        cardId={item.id}
        layout="columns"
      />
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
