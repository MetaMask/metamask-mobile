import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import SocialFeedSkeleton from '../../../SocialFeed/components/SocialFeedSkeleton';
import { useLoadMoreOnScroll } from '../tokenDetailsScroll';
import TokenHolderRow from './holders/TokenHolderRow';
import { useTokenHolders } from './holders/useTokenHolders';

export const TokenDetailsHoldersTabSelectorsIDs = {
  CONTAINER: 'token-details-v1-holders-list',
  EMPTY: 'token-details-v1-holders-empty',
  ERROR: 'token-details-v1-holders-error',
  RETRY: 'token-details-v1-holders-retry',
  NEXT_PAGE: 'token-details-v1-holders-next-page',
} as const;

interface TokenDetailsHoldersTabProps {
  assetId: CaipAssetType;
  /** The visible tab pages alone follow the page scroll for more rows. */
  isActive?: boolean;
}

/**
 * Holders of the token on screen: each trader's position value, with their
 * unrealized P&L percent under it, highest holding first.
 *
 * The list is its own component rather than Social's `SocialLeaderboard`,
 * which ranks traders globally and has no asset-scoped route. Its data comes
 * from `useTokenHolders`; while the holders route is undeployed that is a dev
 * fixture, and an empty page everywhere else.
 */
const TokenDetailsHoldersTab: React.FC<TokenDetailsHoldersTabProps> = ({
  assetId,
  isActive = true,
}) => {
  const socialEnabled = useSelector(selectSocialLeaderboardEnabled);
  const {
    rows,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useTokenHolders({ assetId, enabled: socialEnabled });

  useLoadMoreOnScroll({
    enabled: isActive && hasNextPage && !isFetchingNextPage,
    onLoadMore: loadMore,
  });

  const showSkeleton = isLoading && rows.length === 0;
  const showEmpty = !isLoading && !error && rows.length === 0;

  return (
    <Box
      twClassName="pt-4"
      testID={TokenDetailsHoldersTabSelectorsIDs.CONTAINER}
    >
      {showSkeleton ? <SocialFeedSkeleton /> : null}
      {rows.map((row) => (
        <TokenHolderRow key={row.item.id} row={row} />
      ))}
      {showEmpty ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full px-4 py-8"
          testID={TokenDetailsHoldersTabSelectorsIDs.EMPTY}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('token_details_v1.holders_tab.empty')}
          </Text>
        </Box>
      ) : null}
      {error ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-full px-4 py-16 gap-3"
          testID={TokenDetailsHoldersTabSelectorsIDs.ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {strings('token_details_v1.holders_tab.error.title')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => refresh()}
            twClassName="self-center"
            testID={TokenDetailsHoldersTabSelectorsIDs.RETRY}
          >
            {strings('token_details_v1.holders_tab.error.retry')}
          </Button>
        </Box>
      ) : null}
      {isFetchingNextPage ? (
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="py-2"
          testID={TokenDetailsHoldersTabSelectorsIDs.NEXT_PAGE}
        >
          <ActivityIndicator size="small" />
        </Box>
      ) : null}
    </Box>
  );
};

export default TokenDetailsHoldersTab;
