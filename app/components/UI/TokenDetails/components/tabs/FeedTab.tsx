import { Box } from '@metamask/design-system-react-native';
import { parseCaipAssetType, type CaipAssetType } from '@metamask/utils';
import React, { useCallback, useMemo } from 'react';
import { useSocialFeedPostNavigation } from '../../../../Views/SocialLeaderboard/hooks/useSocialFeedPostNavigation';
import { SocialEntryOptionsProvider, SocialFeed } from '../../../SocialFeed';
import type { SocialFeedPostShellProps } from '../../../SocialFeed/components/SocialFeedPostShell';
import type { SocialFeedListState } from '../../../SocialFeed/utils/getSocialFeedListState';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import TokenDetailsFeedEmptyState from './TokenDetailsFeedEmptyState';

const NATIVE_ASSET_NAMESPACE = 'slip44';

interface TokenDetailsFeedTabProps {
  assetId: CaipAssetType;
  onCopyTrade?: SocialFeedPostShellProps['onCopyTrade'];
  /** The visible tab pages alone follow the page scroll for more posts. */
  isActive?: boolean;
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
  hasBalance = false,
  token,
  onEmptyChange,
}) => {
  const { onAuthorPress, onPositionPress } =
    useSocialFeedPostNavigation('token_details');
  // A native asset has no contract, so the feed is every trader on its chain.
  // A token is the global feed narrowed to that one asset.
  const query = useMemo(() => {
    const { chainId, assetNamespace } = parseCaipAssetType(assetId);
    if (assetNamespace === NATIVE_ASSET_NAMESPACE) {
      return { scope: 'leaderboard' as const, chains: [chainId] };
    }
    return {
      scope: 'all' as const,
      chains: [chainId],
      assetIds: [assetId],
    };
  }, [assetId]);
  const emptyState = useMemo(
    () => <TokenDetailsFeedEmptyState hasBalance={hasBalance} token={token} />,
    [hasBalance, token],
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
