import type { TokenSecurityData } from '@metamask/assets-controllers';
import React, { useCallback, useLayoutEffect, useState, type FC } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useOpenSocialPostComposer } from '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import type { TokenDetailsRouteParams } from '../constants/constants';
import TokenDetailsActionFooter from '../components/TokenDetailsActionFooter';
import { toComposerPosition } from './composerPosition';
import { useOpenPositionHeader } from './useOpenPositionHeader';

const SOCIAL_V1_ASSIGNMENT_OPTIONS = { trackExposure: false };

interface TraderPositionPnlSectionProps {
  token: TokenDetailsRouteParams;
  tokenKey: string;
  securityData?: TokenSecurityData | null;
  /** Reports the laid-out height of the sticky footer. */
  onFooterLayout?: (height: number) => void;
}

/**
 * Launchpad position header above the shared token-details action bar.
 *
 * The header reads this wallet's open position in this token. A missing
 * position shows the wallet value and hides PnL. The Buy, Sell, and Swap
 * buttons are the same bar the legacy page uses; this section only adds the
 * position.
 */
const TraderPositionPnlSection: FC<TraderPositionPnlSectionProps> = ({
  token,
  tokenKey,
  securityData,
  onFooterLayout,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const header = useOpenPositionHeader(token);
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

  return (
    <TokenDetailsActionFooter
      token={token}
      securityData={securityData}
      tdpVersion="v3"
      traderPositionPnl={traderPositionPnl}
      onFooterLayout={onFooterLayout}
    />
  );
};

export default TraderPositionPnlSection;
