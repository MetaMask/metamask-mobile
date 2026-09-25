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

const compactSubHeader = (
  marketCapLabel?: string,
  volumeLabel?: string,
): string | undefined => {
  const mcSuffix = strings(
    'social_leaderboard.feed.sub_header.market_cap_suffix',
  );
  const parts: string[] = [];
  if (marketCapLabel) {
    parts.push(`${marketCapLabel} ${mcSuffix}`);
  }
  if (volumeLabel) {
    parts.push(volumeLabel);
  }
  return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
};

/** The position card that forms the body of a post, per feed item variant. */
const PositionCardBody: React.FC<{ item: SocialV1FeedItem }> = ({ item }) => {
  if (item.variant === 'perpsOpen') {
    const stats: PositionCardStatRow[] = [
      {
        key: 'leverage',
        label: strings('social_leaderboard.feed.position_card.leverage'),
        value: item.leverageLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'leverage'),
      },
      {
        key: 'autoClose',
        label: strings('social_leaderboard.feed.position_card.auto_close'),
        value: item.autoCloseLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'autoClose'),
      },
      {
        key: 'entry',
        label: strings('social_leaderboard.feed.position_card.entry_price'),
        value: item.entryPriceLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'entry'),
      },
    ];

    return (
      <PositionCardShell>
        <PositionCardHeader
          layout="open"
          avatar={item.asset.avatar}
          symbol={item.asset.symbol}
          direction={item.direction}
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

  if (item.variant === 'perpsClosed') {
    const stats: PositionCardStatRow[] = [
      {
        key: 'entry',
        label: strings('social_leaderboard.feed.position_card.entry_price'),
        value: item.entryPriceLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'entry'),
      },
      {
        key: 'exit',
        label: strings('social_leaderboard.feed.position_card.exit_price'),
        value: item.exitPriceLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'exit'),
      },
      {
        key: 'holdTime',
        label: strings('social_leaderboard.feed.position_card.max_hold_time'),
        value: item.holdTimeLabel,
        testID: getSocialFeedPositionCardStatTestId(item.id, 'holdTime'),
      },
      {
        key: 'status',
        label: strings('social_leaderboard.feed.position_card.status'),
        value:
          item.statusLabel ??
          strings('social_leaderboard.feed.position_card.closed'),
        testID: getSocialFeedPositionCardStatTestId(item.id, 'status'),
        leadingValueAccessory: (
          <Box
            twClassName="w-1.5 h-1.5 rounded-full bg-error-default"
            testID={getSocialFeedPositionCardStatTestId(item.id, 'status-dot')}
          />
        ),
      },
    ];

    return (
      <PositionCardShell>
        <PositionCardHeader
          layout="closed"
          avatar={item.asset.avatar}
          symbol={item.asset.symbol}
          direction={item.direction}
          leverageLabel={item.leverageLabel}
          valueLabel={item.valueLabel}
          pnlLabel={item.pnlLabel}
          isPnlPositive={item.isPnlPositive}
        />
        <PositionCardStats rows={stats} cardId={item.id} />
      </PositionCardShell>
    );
  }

  return (
    <PositionCardShell>
      <PositionCardHeader
        layout="compact"
        avatar={item.asset.avatar}
        symbol={item.asset.symbol}
        side={item.side}
        subHeaderLabel={compactSubHeader(item.marketCapLabel, item.volumeLabel)}
        valueLabel={item.valueLabel}
        pnlLabel={item.pnlLabel}
        isPnlPositive={item.isPnlPositive}
      />
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
    now={now}
  >
    <PositionCardBody item={item} />
  </FeedPost>
);

export default SocialFeedPositionCard;
