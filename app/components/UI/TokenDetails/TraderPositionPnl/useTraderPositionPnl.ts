import { useCallback, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useOpenSocialPostComposer } from '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import type { TokenDetailsRouteParams } from '../constants/constants';
import type { TraderPositionPnlProps } from './TraderPositionPnl';
import { toComposerPosition } from './composerPosition';
import { useOpenPositionHeader } from './useOpenPositionHeader';

const SOCIAL_V1_ASSIGNMENT_OPTIONS = { trackExposure: false };

interface UseTraderPositionPnlOptions {
  token: TokenDetailsRouteParams;
  /** Identity of the token on screen; resets the expanded state when it changes. */
  tokenKey: string;
  /**
   * Gates the open-position request and the resulting PnL. When `false` the
   * hook makes no Social API call and returns `undefined`, so the footer
   * renders exactly as it does without a position.
   */
  enabled?: boolean;
}

interface UseTraderPositionPnlResult {
  /** Ready to spread onto `TokenDetailsStickyFooter`; `undefined` hides the line. */
  traderPositionPnl: TraderPositionPnlProps | undefined;
  /**
   * True while the open-position request for a position-capable page has not
   * settled. The footer holds back its first render until this is false so it
   * appears once in its final shape instead of flipping container types.
   * Always `false` when the hook is disabled, so a page that is not
   * position-capable never hides its footer on this signal.
   */
  isLoading: boolean;
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
  enabled = true,
}: UseTraderPositionPnlOptions): UseTraderPositionPnlResult => {
  const [isExpanded, setIsExpanded] = useState(false);
  const header = useOpenPositionHeader(token, { enabled });
  const { openComposer } = useOpenSocialPostComposer();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const { variant: socialV1Variant } = useABTest(
    SOCIAL_V1_AB_KEY,
    SOCIAL_V1_VARIANTS,
    SOCIAL_V1_ASSIGNMENT_OPTIONS,
  );

  // The composer and profile onboarding are registered on MainNavigator only
  // under this gate. Without a position to attach, Share to feed is omitted.
  const sharePosition = header.sharePosition;
  const canShareToFeed =
    isSocialLeaderboardEnabled &&
    socialV1Variant.useSocialV1 &&
    sharePosition != null;
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

  // `isPositionLoading` already folds in the `enabled` flag (a disabled hook
  // never starts the request), so this stays false on non-position pages.
  return { traderPositionPnl, isLoading: header.isPositionLoading };
};
