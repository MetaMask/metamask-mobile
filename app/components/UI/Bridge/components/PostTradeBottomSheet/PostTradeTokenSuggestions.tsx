import React, { useCallback, useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { isCaipChainId } from '@metamask/utils';
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
import {
  getCaipChainIdFromAssetId,
  getNetworkBadgeSource,
} from '../../../Trending/components/TrendingTokenRowItem/utils';
import { formatPercentChange } from '../../../Trending/utils/formatPercentChange';
import { strings } from '../../../../../../locales/i18n';
import { PostTradeStatus } from './PostTradeBottomSheet.types';
import { usePostTradeTrendingTokens } from './usePostTradeTrendingTokens';
import {
  getPostTradeSuggestionPillTestId,
  PostTradeBottomSheetTestIds,
} from './PostTradeBottomSheet.testIds';

const LOGO_SIZE = 24;
const ROW_COUNT = 2;

interface PostTradeTokenSuggestionsProps {
  status: PostTradeStatus;
  destToken?: BridgeToken;
  onTokenPress: (token: TrendingAsset) => void;
}

interface PostTradeSuggestionPillProps {
  token: TrendingAsset;
  onPress: (token: TrendingAsset) => void;
}

const SuggestionsSkeleton = ({ rowCount }: { rowCount?: number }) => (
  <Box testID={PostTradeBottomSheetTestIds.SUGGESTIONS_SKELETON}>
    <SectionPillsSkeleton rowCount={rowCount} />
  </Box>
);

const PostTradeSuggestionPill = React.memo(
  ({ token, onPress }: PostTradeSuggestionPillProps) => {
    const networkBadgeImageSource = useMemo(() => {
      const caipChainId = getCaipChainIdFromAssetId(token.assetId);
      if (!isCaipChainId(caipChainId)) {
        return undefined;
      }
      return getNetworkBadgeSource(caipChainId);
    }, [token.assetId]);

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
            size={LOGO_SIZE}
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

  const renderItem = useCallback(
    (token: TrendingAsset) => (
      <PostTradeSuggestionPill token={token} onPress={onTokenPress} />
    ),
    [onTokenPress],
  );

  if (!shouldShowSuggestions || (!isLoading && tokens.length === 0)) {
    return null;
  }

  return (
    <Box
      twClassName="px-4 pb-2"
      testID={PostTradeBottomSheetTestIds.SUGGESTIONS_SECTION}
    >
      <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
        {strings('bridge.post_trade_modal.what_to_swap_next')}
      </Text>
      <PillScrollList
        data={tokens}
        isLoading={isLoading}
        renderItem={renderItem}
        keyExtractor={(token) => token.assetId}
        Skeleton={SuggestionsSkeleton}
        rowCount={ROW_COUNT}
        maxPills={20}
        listTestId={PostTradeBottomSheetTestIds.SUGGESTIONS_LIST}
        wrapperTwClassName="-mx-4 bg-transparent mt-3 mb-0"
      />
    </Box>
  );
};
