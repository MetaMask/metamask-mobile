import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
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

/** Matches the perps watchlist suggested-section animation timing. */
const ANIMATION_DURATION = 250;

interface WatchlistSuggestedSectionProps {
  /** Suggested tokens to render (already count-capped by the caller). */
  tokens: WatchlistTokenWithBalance[];
  /**
   * Whether the user's watchlist has items. Mirrors the perps flow: an empty
   * watchlist renders the rows silently, a non-empty one labels them
   * "Suggested".
   */
  hasWatchlist: boolean;
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

/**
 * Suggested tokens beneath the homepage watchlist rows, mirroring the perps
 * watchlist suggested section: rows only when the watchlist is empty, a
 * "Suggested" sub-header once the user watches at least one token.
 */
const WatchlistSuggestedSection: React.FC<WatchlistSuggestedSectionProps> = ({
  tokens,
  hasWatchlist,
  onAddPress,
}) => (
  <Box testID="watchlist-suggested-section">
    {hasWatchlist ? (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-1"
        testID="watchlist-suggested-header"
      >
        {strings('token_watchlist.suggested')}
      </Text>
    ) : null}
    <Animated.View layout={LinearTransition.duration(ANIMATION_DURATION)}>
      {tokens.map((token) => (
        <Animated.View
          key={String(token.assetId)}
          entering={FadeIn.duration(ANIMATION_DURATION)}
          exiting={FadeOut.duration(ANIMATION_DURATION)}
          layout={LinearTransition.duration(ANIMATION_DURATION)}
        >
          <TrendingTokenRowItem
            token={mapWatchlistTokenToTrendingAsset(token)}
            tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
            endAction={{ type: 'watchlist', onPress: () => onAddPress(token) }}
          />
        </Animated.View>
      ))}
    </Animated.View>
  </Box>
);

export default WatchlistSuggestedSection;
