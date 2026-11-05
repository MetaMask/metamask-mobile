import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import TrendingTokenLogo from '../../../../../UI/Trending/components/TrendingTokenLogo';
import { useTrendingTokenPress } from '../../../../../UI/Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { TokenDetailsSource } from '../../../../../UI/TokenDetails/constants/constants';
import { mapWatchlistTokenToTrendingAsset } from '../utils/mapWatchlistTokenToTrendingAsset';
import WatchlistAnimatedRow from './WatchlistAnimatedRow';
import { WatchlistSuggestedPillsTestIds } from './WatchlistSuggestedPills.testIds';

const PILL_LOGO_SIZE = 20;

interface WatchlistSuggestedPillProps {
  token: WatchlistTokenWithBalance;
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

const WatchlistSuggestedPill: React.FC<WatchlistSuggestedPillProps> = ({
  token,
  onAddPress,
}) => {
  const tw = useTailwind();
  const assetId = String(token.assetId);
  const trendingAsset = useMemo(
    () => mapWatchlistTokenToTrendingAsset(token),
    [token],
  );
  // Same navigation as tapping a suggested row (TrendingTokenRowItem default).
  const { onPress } = useTrendingTokenPress({
    token: trendingAsset,
    tokenDetailsSource: TokenDetailsSource.WatchlistHomepage,
  });

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="rounded-full bg-muted pl-1 pr-1"
      testID={WatchlistSuggestedPillsTestIds.pill(assetId)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={token.name ?? token.symbol}
        testID={WatchlistSuggestedPillsTestIds.pillBody(assetId)}
        style={({ pressed }) =>
          tw.style(
            'flex-row items-center gap-2 py-1 pl-1',
            pressed && 'opacity-50',
          )
        }
      >
        <TrendingTokenLogo
          assetId={assetId}
          symbol={token.symbol}
          size={PILL_LOGO_SIZE}
          recyclingKey={assetId}
        />
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {token.symbol}
        </Text>
      </Pressable>
      <ButtonIcon
        iconName={IconName.Star}
        size={ButtonIconSize.Sm}
        onPress={() => onAddPress(token)}
        accessibilityLabel={strings('token_watchlist.add_to_watchlist')}
        testID={WatchlistSuggestedPillsTestIds.addButton(assetId)}
      />
    </Box>
  );
};

interface WatchlistSuggestedPillsProps {
  tokens: WatchlistTokenWithBalance[];
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

/**
 * Compact, horizontally scrollable suggestions shown on the Home watchlist
 * section once the user already watches at least one asset (ASSETS-4186).
 */
const WatchlistSuggestedPills: React.FC<WatchlistSuggestedPillsProps> = ({
  tokens,
  onAddPress,
}) => {
  const tw = useTailwind();

  return (
    <Box testID={WatchlistSuggestedPillsTestIds.CONTAINER} twClassName="mt-2">
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-2"
        testID={WatchlistSuggestedPillsTestIds.HEADER}
      >
        {strings('token_watchlist.suggested')}
      </Text>
      {/* Bleed past SectionRow padding so pills scroll edge to edge. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tw.style('-mx-4')}
        contentContainerStyle={tw.style('flex-row items-center gap-2 px-4')}
        testID={WatchlistSuggestedPillsTestIds.SCROLL}
      >
        {tokens.map((token) => (
          <WatchlistAnimatedRow key={String(token.assetId)}>
            <WatchlistSuggestedPill token={token} onAddPress={onAddPress} />
          </WatchlistAnimatedRow>
        ))}
      </ScrollView>
    </Box>
  );
};

export default WatchlistSuggestedPills;
