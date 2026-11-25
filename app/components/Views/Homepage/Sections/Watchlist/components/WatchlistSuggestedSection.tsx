import React from 'react';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { PerpsMarketData } from '@metamask/perps-controller';
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
import type { SuggestedWatchlistRow } from '../../../../../UI/Watchlist/utils';
import PerpsMarketRowItem from '../../../../../UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import WatchlistTokenRowItem from '../../../../../UI/Watchlist/WatchlistTokenRowItem';

interface WatchlistSuggestedSectionProps {
  tokens?: WatchlistTokenWithBalance[];
  rows?: SuggestedWatchlistRow[];
  hasWatchlist: boolean;
  onAddPress: (token: WatchlistTokenWithBalance) => void;
  tokenDetailsSource?: TokenDetailsSource;
  rowTwClassName?: string;
  onPerpPress?: (market: PerpsMarketData) => void;
  onAddPerpPress?: (market: PerpsMarketData) => void;
  canUseLivePerpsPrices?: boolean;
  enableMotion?: boolean;
  showTypeTag?: boolean;
}

const WatchlistSuggestedSection: React.FC<WatchlistSuggestedSectionProps> = ({
  tokens,
  rows,
  hasWatchlist,
  onAddPress,
  tokenDetailsSource = TokenDetailsSource.WatchlistHomepage,
  rowTwClassName = '-mx-4 w-auto px-4',
  onPerpPress,
  onAddPerpPress,
  canUseLivePerpsPrices = false,
  enableMotion = true,
  showTypeTag = false,
}) => {
  const suggestedRows: SuggestedWatchlistRow[] =
    rows ??
    (tokens ?? []).map((token) => ({
      kind: 'token' as const,
      key: String(token.assetId),
      token,
    }));

  return (
    <Box testID="watchlist-suggested-section">
      {hasWatchlist && (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName={rowTwClassName === 'px-4' ? 'mb-1 px-4 pt-2' : 'mb-1'}
          testID="watchlist-suggested-header"
        >
          {strings('token_watchlist.suggested')}
        </Text>
      )}
      <Animated.View
        layout={LinearTransition.duration(WATCHLIST_ROW_ANIMATION_DURATION_MS)}
      >
        {suggestedRows.map((suggestion) => (
          <WatchlistAnimatedRow
            key={suggestion.key}
            enableMotion={enableMotion}
          >
            {suggestion.kind === 'token' ? (
              showTypeTag ? (
                <WatchlistTokenRowItem
                  token={mapWatchlistTokenToTrendingAsset(suggestion.token)}
                  tokenDetailsSource={tokenDetailsSource}
                  twClassName={rowTwClassName}
                  showTypeTag
                  onAddPress={() => onAddPress(suggestion.token)}
                />
              ) : (
                <TrendingTokenRowItem
                  token={mapWatchlistTokenToTrendingAsset(suggestion.token)}
                  tokenDetailsSource={tokenDetailsSource}
                  twClassName={rowTwClassName}
                  endAction={{
                    type: 'watchlist',
                    onPress: () => onAddPress(suggestion.token),
                  }}
                />
              )
            ) : (
              <PerpsMarketRowItem
                market={suggestion.market}
                compact
                showBadge={false}
                showTypeTag={showTypeTag}
                enableLivePrices={canUseLivePerpsPrices}
                twClassName={rowTwClassName}
                onPress={onPerpPress}
                onAddPress={onAddPerpPress}
              />
            )}
          </WatchlistAnimatedRow>
        ))}
      </Animated.View>
    </Box>
  );
};

export default WatchlistSuggestedSection;
