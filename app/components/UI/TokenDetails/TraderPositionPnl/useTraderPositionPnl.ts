import { useCallback, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSocialV1Enabled } from '../../../../selectors/featureFlagController/socialV1';
import { useOpenSocialPostComposer } from '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import type { TokenDetailsRouteParams } from '../constants/constants';
import type { TraderPositionPnlProps } from './TraderPositionPnl';
import { toComposerPosition } from './composerPosition';
import { useOpenPositionHeader } from './useOpenPositionHeader';

interface UseTraderPositionPnlOptions {
  token: TokenDetailsRouteParams;
  /** Identity of the token on screen; resets the expanded state when it changes. */
  tokenKey: string;
}

interface UseTraderPositionPnlResult {
  /** Ready to spread onto `TokenDetailsStickyFooter`; `undefined` hides the line. */
  traderPositionPnl: TraderPositionPnlProps | undefined;
}

/**
 * Builds the sticky-footer trader position header for a token.
 *
 * The header reads this wallet's open position in this token. A missing
 * position shows the wallet value and hides PnL. Share to feed is attached
 * only when the social surfaces are enabled and a position exists to post.
 *
 * Extracted from the memecoin V1 footer so the legacy page can mount the same
 * line without adopting the V1 button config.
 */
export const useTraderPositionPnl = ({
  token,
  tokenKey,
}: UseTraderPositionPnlOptions): UseTraderPositionPnlResult => {
  const [isExpanded, setIsExpanded] = useState(false);
  const header = useOpenPositionHeader(token);
  const { openComposer } = useOpenSocialPostComposer();
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);

  // The composer and profile onboarding are registered on MainNavigator only
  // under this gate. Without a position to attach, Share to feed is omitted.
  const sharePosition = header.sharePosition;
  const canShareToFeed = isSocialV1Enabled && sharePosition != null;
  const shareToFeedPress = useCallback(() => {
    if (!sharePosition) {
      return;
    }
    openComposer({
      position: toComposerPosition(sharePosition),
      entryPoint: 'token_details',
    });
  }, [sharePosition, openComposer]);

  useLayoutEffect(() => {
    setIsExpanded(false);
  }, [tokenKey]);

  const shareToFeed = canShareToFeed ? { onShare: shareToFeedPress } : {};
  const traderPositionPnl =
    header.positionValue !== undefined
      ? {
          positionValue: header.positionValue,
          pnl: header.pnl,
          ...(header.expandedDetails
            ? {
                expandedDetails: {
                  ...header.expandedDetails,
                  ...shareToFeed,
                },
              }
            : {}),
          isLoading: header.isLoading,
          isExpanded,
          onToggleExpanded: setIsExpanded,
        }
      : undefined;

  return { traderPositionPnl };
};
