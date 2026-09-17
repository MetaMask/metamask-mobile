import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { SocialV1FeedItem } from '../types';
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

const statId = getSocialFeedPositionCardStatTestId;

/** The closed-card stat rows, identical for perps and spot. */
const closedStats = (item: {
  id: string;
  entryPriceLabel?: string;
  exitPriceLabel?: string;
  holdTimeLabel?: string;
  statusLabel?: string;
}): PositionCardStatRow[] => [
  {
    key: 'entry',
    label: strings('social_leaderboard.feed.position_card.entry_price'),
    value: item.entryPriceLabel,
    testID: statId(item.id, 'entry'),
  },
  {
    key: 'exit',
    label: strings('social_leaderboard.feed.position_card.exit_price'),
    value: item.exitPriceLabel,
    testID: statId(item.id, 'exit'),
  },
  {
    key: 'holdTime',
    label: strings('social_leaderboard.feed.position_card.max_hold_time'),
    value: item.holdTimeLabel,
    testID: statId(item.id, 'holdTime'),
  },
  {
    key: 'status',
    label: strings('social_leaderboard.feed.position_card.status'),
    value:
      item.statusLabel ??
      strings('social_leaderboard.feed.position_card.closed'),
    testID: statId(item.id, 'status'),
    leadingValueAccessory: (
      <Box
        twClassName="w-1.5 h-1.5 rounded-full bg-error-default"
        testID={statId(item.id, 'status-dot')}
      />
    ),
  },
];

/**
 * The position card that forms the body of a post.
 *
 * Two shapes, not four: an open position leads with its current value and
 * offers Copy trade, a closed one leads with a hero realized P&L and offers
 * nothing to copy. The asset class only decides which stat rows sit between --
 * perps carry leverage and the auto-close bracket, spot carries neither.
 */
const PositionCardBody: React.FC<{ item: SocialV1FeedItem }> = ({ item }) => {
  if (item.variant === 'perpsOpen' || item.variant === 'spotOpen') {
    const stats: PositionCardStatRow[] =
      item.variant === 'perpsOpen'
        ? [
            {
              key: 'leverage',
              label: strings('social_leaderboard.feed.position_card.leverage'),
              value: item.leverageLabel,
              testID: statId(item.id, 'leverage'),
            },
            {
              key: 'autoClose',
              label: strings(
                'social_leaderboard.feed.position_card.auto_close',
              ),
              value: item.autoCloseLabel,
              testID: statId(item.id, 'autoClose'),
            },
            {
              key: 'entry',
              label: strings(
                'social_leaderboard.feed.position_card.entry_price',
              ),
              value: item.entryPriceLabel,
              testID: statId(item.id, 'entry'),
            },
          ]
        : [
            {
              key: 'entry',
              label: strings(
                'social_leaderboard.feed.position_card.entry_price',
              ),
              value: item.entryPriceLabel,
              testID: statId(item.id, 'entry'),
            },
            {
              key: 'holdTime',
              label: strings('social_leaderboard.feed.position_card.hold_time'),
              value: item.holdTimeLabel,
              testID: statId(item.id, 'holdTime'),
            },
          ];

    return (
      <PositionCardShell>
        <PositionCardHeader
          layout="open"
          avatar={item.asset.avatar}
          symbol={item.asset.symbol}
          direction={item.variant === 'perpsOpen' ? item.direction : undefined}
          side={item.variant === 'spotOpen' ? item.side : undefined}
          markPriceLabel={item.markPriceLabel}
          valueLabel={item.valueLabel}
          pnlLabel={item.pnlLabel}
          isPnlPositive={item.isPnlPositive}
        />
        <PositionCardStats rows={stats} cardId={item.id} />
        <CopyTradeButton
          testID={getSocialFeedPositionCardCopyTradeTestId(item.id)}
        />
      </PositionCardShell>
    );
  }

  return (
    <PositionCardShell>
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
      <PositionCardStats rows={closedStats(item)} cardId={item.id} />
    </PositionCardShell>
  );
};

const SocialFeedPositionCard: React.FC<SocialFeedPositionCardProps> = ({
  item,
  now,
}) => (
  <FeedPost
    id={item.id}
    author={item.author}
    timestamp={item.timestamp}
    comment={item.comment}
    isWinRateMocked={item.mockedFields.includes('winRate')}
    now={now}
  >
    <PositionCardBody item={item} />
  </FeedPost>
);

export default SocialFeedPositionCard;
