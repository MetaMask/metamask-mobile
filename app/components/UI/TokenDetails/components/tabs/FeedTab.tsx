import { Box } from '@metamask/design-system-react-native';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import {
  SocialEvent,
  useSocialScreenAnalytics,
} from '../../../../Views/SocialLeaderboard/analytics';
import { useSocialFeedPostNavigation } from '../../../../Views/SocialLeaderboard/hooks/useSocialFeedPostNavigation';
import { SocialEntryOptionsProvider, SocialFeed } from '../../../SocialFeed';
import type { SocialFeedPostShellProps } from '../../../SocialFeed/components/SocialFeedPostShell';
import type { SocialFeedListState } from '../../../SocialFeed/utils/getSocialFeedListState';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  /** The visible tab pages alone follow the page scroll for more posts. */
  isActive?: boolean;
  animateEmptyState?: boolean;
  /** True when this wallet holds the token. Picks the empty-state copy. */
  hasBalance?: boolean;
  /** Token on screen, so the empty-state post opens on this holding. */
  token?: TokenDetailsRouteParams;
  /** Reports whether the feed is showing its empty state. */
  onEmptyChange?: (isEmpty: boolean) => void;
}

const TokenDetailsFeedTab: React.FC<TokenDetailsFeedTabProps> = ({
  assetId,
  onCopyTrade,
  isActive,
  animateEmptyState = true,
  hasBalance = false,
  token,
  onEmptyChange,
}) => {
  useSocialScreenAnalytics(SocialEvent.Screen.TOKEN_DETAILS_FEED, {
    source: SocialEvent.Source.TOKEN_DETAILS_FEED,
    isActive,
  });
  const { onAuthorPress, onPositionPress } =
    useSocialFeedPostNavigation('token_details');
  const query = useMemo(() => {
    const { chainId } = parseCaipAssetType(assetId);
    return {
      scope: 'all' as const,
      chains: [chainId],
      assetIds: [assetId],
    };
  }, [assetId]);
  const emptyState = useMemo(
    () => (
      <TokenDetailsFeedEmptyState
        hasBalance={hasBalance}
        token={token}
        animate={animateEmptyState}
      />
    ),
    [animateEmptyState, hasBalance, token],
  );
  const handleListStateChange = useCallback(
    (state: SocialFeedListState) => {
      onEmptyChange?.(state.showEmpty);
    },
    [onEmptyChange],
  );

  return (
    <SocialEntryOptionsProvider>
      <Box twClassName="pt-4">
        <SocialFeed
          {...query}
          location="token_details"
          isActive={isActive}
          realtime
          onAuthorPress={onAuthorPress}
          onCopyTrade={onCopyTrade}
          onPositionPress={onPositionPress}
          emptyState={emptyState}
          onListStateChange={handleListStateChange}
        />
      </Box>
    </SocialEntryOptionsProvider>
  );
};

export default TokenDetailsFeedTab;
