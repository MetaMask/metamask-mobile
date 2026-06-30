import React, { useCallback, useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { ImageSourcePropType } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { BridgeToken } from '../../types';
import PillScrollList from '../../../Trending/components/PillScrollList/PillScrollList';
import SectionPillsSkeleton from '../../../Trending/components/SectionPillsSkeleton/SectionPillsSkeleton';
import ExplorePill from '../../../Trending/components/ExplorePill/ExplorePill';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { getNetworkBadgeSource } from '../../../Trending/components/TrendingTokenRowItem/utils';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
import { strings } from '../../../../../../locales/i18n';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
import { usePostTradeTrendingTokens } from './usePostTradeTrendingTokens';
import {
  getPostTradeSuggestionPillTestId,
  PostTradeBottomSheetTestIds,
} from './PostTradeBottomSheet.testIds';

interface PostTradeSuggestionPillProps {
  token: TrendingAsset;
  networkBadgeImageSource?: ImageSourcePropType;
  onPress: (token: TrendingAsset) => void;
}

const PostTradeSuggestionPill = React.memo(
  ({
    token,
    networkBadgeImageSource,
    onPress,
  }: PostTradeSuggestionPillProps) => {
    const { changeLabel, changeTextColor } = useMemo(
      () => formatPercentChange(token.priceChangePct?.h24),
      [token.priceChangePct],
    );

    const leading = useMemo(
      () => (
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              size={AvatarSize.Xs}
              variant={BadgeVariant.Network}
              imageSource={networkBadgeImageSource}
              isScaled={false}
            />
          }
        >
          <TrendingTokenLogo
            assetId={token.assetId}
            symbol={token.symbol}
            size={24}
            recyclingKey={token.assetId}
          />
        </BadgeWrapper>
      ),
      [networkBadgeImageSource, token.assetId, token.symbol],
    );

    const handlePress = useCallback(() => {
      onPress(token);
    }, [onPress, token]);

    return (
      <ExplorePill
        onPress={handlePress}
        testID={getPostTradeSuggestionPillTestId(token.assetId)}
        leading={leading}
        title={token.symbol}
        changeLabel={changeLabel}
        changeTextColor={changeTextColor}
      />
    );
  },
);

interface PostTradeTokenSuggestionsProps {
  status: PostTradeStatus;
  destToken?: BridgeToken;
  onTokenPress: (token: TrendingAsset) => void;
}

export const PostTradeTokenSuggestions = ({
  status,
  destToken,
  onTokenPress,
}: PostTradeTokenSuggestionsProps) => {
  const shouldShowSuggestions = status !== PostTradeStatus.Failed;
  const { tokens, isLoading } = usePostTradeTrendingTokens({
    destToken,
    enabled: shouldShowSuggestions,
  });
  const networkBadgeImageSource = useMemo(
    () =>
      destToken?.chainId
        ? getNetworkBadgeSource(formatChainIdToCaip(destToken.chainId))
        : undefined,
    [destToken?.chainId],
  );

  const renderItem = useCallback(
    (token: TrendingAsset) => (
      <PostTradeSuggestionPill
        token={token}
        networkBadgeImageSource={networkBadgeImageSource}
        onPress={onTokenPress}
      />
    ),
    [networkBadgeImageSource, onTokenPress],
  );

  if (!shouldShowSuggestions || (!isLoading && tokens.length === 0)) {
    return null;
  }

  return (
    <Box
      twClassName="px-4 pb-4"
      testID={PostTradeBottomSheetTestIds.SUGGESTIONS_SECTION}
    >
      <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
        {strings('bridge.post_trade_modal.what_to_swap_next')}
      </Text>
      <PillScrollList
        data={tokens}
        isLoading={isLoading}
        renderItem={renderItem}
        keyExtractor={(token) => token.assetId}
        Skeleton={SectionPillsSkeleton}
        rowCount={2}
        maxPills={20}
        listTestId={PostTradeBottomSheetTestIds.SUGGESTIONS_LIST}
        wrapperTwClassName="-mx-4 bg-transparent mt-2 mb-0"
      />
    </Box>
  );
};
