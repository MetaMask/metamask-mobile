import React from 'react';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import TrendingTokenRowItem from '../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { TokenDetailsSource } from '../../../../../UI/TokenDetails/constants/constants';
import { mapWatchlistTokenToTrendingAsset } from '../utils/mapWatchlistTokenToTrendingAsset';
import WatchlistAnimatedRow, {
  WATCHLIST_ROW_ANIMATION_DURATION_MS,
} from './WatchlistAnimatedRow';

/**
 * Full-size suggested rows, shown on Home only while the watchlist is empty.
 * Once the user watches assets, `WatchlistSuggestedPills` is used instead.
 */
interface WatchlistSuggestedSectionProps {
  tokens: WatchlistTokenWithBalance[];
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

const WatchlistSuggestedSection: React.FC<WatchlistSuggestedSectionProps> = ({
  tokens,
  onAddPress,
}) => (
  <Box testID="watchlist-suggested-section">
    <Animated.View
      layout={LinearTransition.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)}
    >
      {tokens.map((token) => (
        <WatchlistAnimatedRow key={String(token.assetId)}>
          <TrendingTokenRowItem
            token={mapWatchlistTokenToTrendingAsset(token)}
            tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
            endAction={{ type: 'watchlist', onPress: () => onAddPress(token) }}
          />
        </WatchlistAnimatedRow>
      ))}
    </Animated.View>
  </Box>
);

export default WatchlistSuggestedSection;
