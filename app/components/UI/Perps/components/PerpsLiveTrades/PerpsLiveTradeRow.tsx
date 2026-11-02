import React from 'react';
import { ListItem, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import TraderAvatar from '../../../SocialFeed/components/TraderAvatar';
import type { SocialV1FeedPost } from '../../../SocialFeed';
import { formatPercent } from '../../../SocialFeed/utils/formatters';
import { PERPS_LIVE_TRADES_CONFIG } from '../../constants/perpsConfig';
import { getPerpsLiveTradeRowSelector } from '../../Perps.testIds';

interface PerpsLiveTradeRowProps {
  post: SocialV1FeedPost;
}

const getDirectionLabel = (item: SocialV1FeedPost['item']) => {
  if (item.variant !== 'perpsOpen' && item.variant !== 'perpsClosed') {
    return undefined;
  }
  return strings(
    item.direction === 'long' ? 'perps.market.long' : 'perps.market.short',
  );
};

const PerpsLiveTradeRow: React.FC<PerpsLiveTradeRowProps> = ({ post }) => {
  const { item } = post;
  const winRatePercent = item.author.winRatePercent;
  const hasWinRate = winRatePercent !== null;

  return (
    <ListItem
      twClassName="py-2"
      testID={getPerpsLiveTradeRowSelector(post.id)}
      avatar={
        <TraderAvatar
          imageUrl={post.authorImageUrl ?? item.author.avatarUri}
          address={item.author.address ?? item.author.id}
          size={PERPS_LIVE_TRADES_CONFIG.AvatarSize}
          recyclingKey={item.author.id}
        />
      }
      title={post.authorHandle}
      description={[item.asset.symbol, getDirectionLabel(item), item.costLabel]
        .filter(Boolean)
        .join(' · ')}
      value={
        hasWinRate
          ? formatPercent(winRatePercent, { showSign: false, decimals: 0 })
          : undefined
      }
      valueProps={
        hasWinRate &&
        winRatePercent >= PERPS_LIVE_TRADES_CONFIG.HighlightWinRatePercent
          ? { color: TextColor.SuccessDefault }
          : undefined
      }
      subvalue={hasWinRate ? strings('perps.home.win_rate') : undefined}
    />
  );
};

export default PerpsLiveTradeRow;
