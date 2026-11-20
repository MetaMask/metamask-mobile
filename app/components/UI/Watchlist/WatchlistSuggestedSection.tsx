import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import PerpsMarketRowItem from '../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import type { WatchlistTokenWithBalance } from '../Assets/watchlist/utils/addBalanceToTokens';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';
import WatchlistTokenRowItem from './WatchlistTokenRowItem';
import {
  mapWatchlistTokenToTrendingAsset,
  type SuggestedWatchlistRow,
} from './utils';

const WATCHLIST_ROW_ANIMATION_DURATION_MS = 250;

interface WatchlistSuggestedSectionProps {
  rows: SuggestedWatchlistRow[];
  hasWatchlist: boolean;
  onAddPress: (token: WatchlistTokenWithBalance) => void;
  tokenDetailsSource?: TokenDetailsSource;
  onPerpPress?: (market: PerpsMarketData) => void;
  onAddPerpPress?: (market: PerpsMarketData) => void;
  canUseLivePerpsPrices?: boolean;
  showPerpBadge?: boolean;
  rowTwClassName?: string;
  enableMotion?: boolean;
}

const WatchlistSuggestedSection: React.FC<WatchlistSuggestedSectionProps> = ({
  rows,
  hasWatchlist,
  onAddPress,
  tokenDetailsSource = TokenDetailsSource.WatchlistHomepage,
  onPerpPress,
  onAddPerpPress,
  canUseLivePerpsPrices = false,
  showPerpBadge = true,
  rowTwClassName = 'px-0',
  enableMotion = true,
}) => {
  const reduceMotion = useReducedMotion() || !enableMotion;
  const layoutAnimation = reduceMotion
    ? undefined
    : LinearTransition.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS);
  const enterAnimation = reduceMotion
    ? undefined
    : FadeIn.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS);
  const exitAnimation = reduceMotion
    ? undefined
    : FadeOut.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS);

  return (
    <Box
      testID="watchlist-suggested-section"
      twClassName={hasWatchlist ? 'pt-2' : undefined}
    >
      {hasWatchlist && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName={['mb-1', rowTwClassName].filter(Boolean).join(' ')}
          testID="watchlist-suggested-header"
        >
          {strings('token_watchlist.suggested')}
        </Text>
      )}
      <Animated.View layout={layoutAnimation}>
        {rows.map((suggestion) => (
          <Animated.View
            key={suggestion.key}
            entering={enterAnimation}
            exiting={exitAnimation}
          >
            {suggestion.kind === 'token' ? (
              <WatchlistTokenRowItem
                token={mapWatchlistTokenToTrendingAsset(suggestion.token)}
                tokenDetailsSource={tokenDetailsSource}
                onAddPress={() => onAddPress(suggestion.token)}
                twClassName={rowTwClassName}
              />
            ) : (
              <PerpsMarketRowItem
                market={suggestion.market}
                compact
                showBadge={showPerpBadge}
                enableLivePrices={canUseLivePerpsPrices}
                twClassName={rowTwClassName}
                onPress={onPerpPress}
                onAddPress={onAddPerpPress}
              />
            )}
          </Animated.View>
        ))}
      </Animated.View>
    </Box>
  );
};

export default WatchlistSuggestedSection;
