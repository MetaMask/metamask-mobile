import { Box } from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import type { SocialV1FeedItem } from '../types';
import CopyTradeButton from './CopyTradeButton';
import PositionCardChart from './PositionCardChart';
import PositionCardComment from './PositionCardComment';
import PositionCardHeader from './PositionCardHeader';
import PositionCardShell from './PositionCardShell';
import PositionCardStats, {
  type PositionCardStatRow,
} from './PositionCardStats';
import {
  getSocialFeedPositionCardChartTestId,
  getSocialFeedPositionCardCommentTestId,
  getSocialFeedPositionCardCopyTradeTestId,
  getSocialFeedPositionCardStatTestId,
  getSocialFeedPositionCardTestId,
} from './SocialFeedPositionCard.testIds';

export interface SocialFeedPositionCardProps {
  item: SocialV1FeedItem;
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

const SocialFeedPositionCard: React.FC<SocialFeedPositionCardProps> = ({
  item,
}) => {
  const commentTestID = getSocialFeedPositionCardCommentTestId(item.id);
  const chartTestID = getSocialFeedPositionCardChartTestId(item.id);

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
      <Box
        twClassName="gap-3"
        testID={getSocialFeedPositionCardTestId(item.id)}
      >
        <PositionCardComment comment={item.comment} testID={commentTestID} />
        <PositionCardShell tone="muted">
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
          <PositionCardChart
            showChart={item.showChart}
            series={item.chartSeries}
            isPnlPositive={item.isPnlPositive}
            testID={chartTestID}
          />
          <PositionCardStats rows={stats} />
          <CopyTradeButton
            testID={getSocialFeedPositionCardCopyTradeTestId(item.id)}
          />
        </PositionCardShell>
      </Box>
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
      <Box
        twClassName="gap-3"
        testID={getSocialFeedPositionCardTestId(item.id)}
      >
        <PositionCardComment comment={item.comment} testID={commentTestID} />
        <PositionCardShell tone="success">
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
          <PositionCardChart
            showChart={item.showChart}
            series={item.chartSeries}
            isPnlPositive={item.isPnlPositive}
            testID={chartTestID}
          />
          <PositionCardStats rows={stats} />
        </PositionCardShell>
      </Box>
    );
  }

  return (
    <Box testID={getSocialFeedPositionCardTestId(item.id)}>
      <PositionCardComment comment={item.comment} testID={commentTestID} />
      <PositionCardShell tone="muted">
        <PositionCardHeader
          layout="compact"
          avatar={item.asset.avatar}
          symbol={item.asset.symbol}
          side={item.side}
          subHeaderLabel={compactSubHeader(
            item.marketCapLabel,
            item.volumeLabel,
          )}
          valueLabel={item.valueLabel}
          pnlLabel={item.pnlLabel}
          isPnlPositive={item.isPnlPositive}
        />
      </PositionCardShell>
    </Box>
  );
};

export default SocialFeedPositionCard;
