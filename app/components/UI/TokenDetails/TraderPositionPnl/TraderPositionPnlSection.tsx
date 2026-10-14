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
import TokenDetailsStickyFooter from '../components/TokenDetailsStickyFooter';
import { useStickyQuickBuy } from '../hooks/useStickyQuickBuy';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { toComposerPosition } from './composerPosition';
import { useOpenPositionHeader } from './useOpenPositionHeader';

const SOCIAL_V1_ASSIGNMENT_OPTIONS = { trackExposure: false };

interface TraderPositionPnlSectionProps {
  token: TokenDetailsRouteParams;
  tokenKey: string;
  securityData?: TokenSecurityData | null;
}

/**
 * Renders the trader position header and its temporary expanded details sheet.
 *
 * The header reads this trader's open positions and keeps the row for this
 * token. A missing position shows the wallet value and hides PnL.
 */
const TraderPositionPnlSection: FC<TraderPositionPnlSectionProps> = ({
  token,
  tokenKey,
  securityData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { onQuickBuyPress, openQuickBuy, quickBuySheet } = useStickyQuickBuy({
    token,
    source: 'asset_details',
  });
  const { balance } = useTokenBalance(token);
  const hasTokenBalance = balance !== undefined && Number(balance) > 0;
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
  // under this gate.
  const canShareToFeed =
    isSocialLeaderboardEnabled && socialV1Variant.useSocialV1;
  const shareToFeedPress = useCallback(() => {
    if (!header.sharePosition) {
      openComposer();
      return;
    }
    openComposer({ position: toComposerPosition(header.sharePosition) });
  }, [header.sharePosition, openComposer]);

  useLayoutEffect(() => {
    setIsExpanded(false);
  }, [tokenKey]);

  const shareToFeed = canShareToFeed ? { onShare: shareToFeedPress } : {};
  const traderPositionPnl =
    header.positionValue !== undefined || header.isLoading
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
    <>
      <TokenDetailsStickyFooter
        token={token}
        securityData={securityData}
        isTokenDetailsV1
        currentTokenBalance={balance}
        hasTokenBalance={hasTokenBalance}
        onQuickBuyPress={onQuickBuyPress}
        quickBuyEntrypointLayout="buy_sell"
        onOpenQuickBuy={openQuickBuy}
        traderPositionPnl={traderPositionPnl}
      />
      {quickBuySheet}
    </>
  );
};

export default TraderPositionPnlSection;
