import React, { useState } from 'react';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import HistoryOnHoldSheet from './HistoryOnHoldSheet';
import { useIsClaimsPaused } from './rewardsClaimStore';
import { formatUsd, KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

interface ClaimsPausedHistoryBannerProps {
  /** Extra classes for the banner, such as the margin under it. */
  twClassName?: string;
}

/**
 * Neutral banner shown while claims are paused. Learn more opens the reward
 * paused sheet. Renders nothing when claims are not paused.
 */
const ClaimsPausedHistoryBanner: React.FC<ClaimsPausedHistoryBannerProps> = ({
  twClassName,
}) => {
  const isClaimsPaused = useIsClaimsPaused();
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  if (!isClaimsPaused) {
    return null;
  }

  return (
    <>
      <BannerAlert
        severity={BannerAlertSeverity.Neutral}
        twClassName={['gap-2 items-center', twClassName]
          .filter(Boolean)
          .join(' ')}
        testID={KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_BANNER}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="flex-1 gap-2"
        >
          <Text variant={TextVariant.BodySm} twClassName="flex-1">
            {strings('rewards.kol.claims_paused_banner', {
              amount: formatUsd(KOL_EARNINGS_FIXTURE.pausedPerpsRewards),
            })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.PrimaryDefault}
            accessibilityRole="link"
            onPress={() => setIsSheetVisible(true)}
            testID={KOL_DASHBOARD_SELECTORS.HISTORY_PAUSED_LEARN_MORE}
          >
            {strings('rewards.kol.claims_paused_learn_more')}
          </Text>
        </Box>
      </BannerAlert>
      <HistoryOnHoldSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
      />
    </>
  );
};

export default ClaimsPausedHistoryBanner;
