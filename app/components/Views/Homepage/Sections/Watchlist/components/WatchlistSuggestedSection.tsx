import React from 'react';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import TrendingTokenRowItem from '../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { TokenDetailsSource } from '../../../../../UI/TokenDetails/constants/constants';
import { mapWatchlistTokenToTrendingAsset } from '../utils/mapWatchlistTokenToTrendingAsset';
import WatchlistAnimatedRow, {
  WATCHLIST_ROW_ANIMATION_DURATION_MS,
} from './WatchlistAnimatedRow';

interface WatchlistSuggestedSectionProps {
  tokens: WatchlistTokenWithBalance[];
  hasWatchlist: boolean;
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

const WatchlistSuggestedSection: React.FC<WatchlistSuggestedSectionProps> = ({
  tokens,
  hasWatchlist,
  onAddPress,
}) => (
  <Box testID="watchlist-suggested-section">
    {hasWatchlist && (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-1"
        testID="watchlist-suggested-header"
      >
        {strings('token_watchlist.suggested')}
      </Text>
    )}
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
