import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { selectIsCurrentSubscriptionVipEnabled } from '../../../../../selectors/rewards';
import { useVipDashboard } from '../../hooks/useVipDashboard';
import { formatNumber } from '../../utils/formatUtils';
import RewardsErrorBanner from '../RewardsErrorBanner';

export const REFERRAL_INFO_SECTION_TEST_IDS = {
  GENERIC: 'referral-info-section-generic',
  VIP: 'referral-info-section-vip',
  VIP_SKELETON: 'referral-info-section-vip-skeleton',
  VIP_ERROR: 'referral-info-section-vip-error',
  VIP_REFERRALS_VALUE: 'referral-info-section-vip-referrals-value',
  VIP_REVENUE_SHARE_VALUE: 'referral-info-section-vip-revenue-share-value',
} as const;

const GenericInfo: React.FC = () => (
  <Box twClassName="gap-2" testID={REFERRAL_INFO_SECTION_TEST_IDS.GENERIC}>
    <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
      {strings('rewards.referral.info.title')}
    </Text>

    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('rewards.referral.info.description')}
    </Text>
  </Box>
);

const ReferralInfoSection: React.FC = () => {
  const tw = useTailwind();
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const {
    dashboard,
    isLoading,
    hasError,
    hasAttemptedFetch,
    fetchVipDashboard,
  } = useVipDashboard();

  if (!isVipEnabled) {
    return <GenericInfo />;
  }

  const showSkeleton = (!hasAttemptedFetch || isLoading) && !dashboard;
  const showError = hasError && !dashboard;

  if (showSkeleton) {
    return (
      <Box
        twClassName="gap-3"
        testID={REFERRAL_INFO_SECTION_TEST_IDS.VIP_SKELETON}
      >
        <Skeleton style={tw.style('h-5 w-full rounded-lg')} />
        <Skeleton style={tw.style('h-5 w-3/4 rounded-lg')} />
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6 mt-2">
          <Box twClassName="flex-1 gap-2">
            <Skeleton style={tw.style('h-4 w-16 rounded-lg')} />
            <Skeleton style={tw.style('h-7 w-20 rounded-lg')} />
          </Box>
          <Box twClassName="flex-1 gap-2">
            <Skeleton style={tw.style('h-4 w-24 rounded-lg')} />
            <Skeleton style={tw.style('h-7 w-20 rounded-lg')} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (showError) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.vip.error_title')}
        description={strings('rewards.vip.error_description')}
        onConfirm={fetchVipDashboard}
        confirmButtonLabel={strings('rewards.vip.retry_button')}
        testID={REFERRAL_INFO_SECTION_TEST_IDS.VIP_ERROR}
      />
    );
  }

  if (!dashboard) {
    return <GenericInfo />;
  }

  const currentTier = dashboard.tiers.find((t) => t.status === 'current');
  const carryoverBps = currentTier?.referralCarryoverBps ?? 0;
  const carryoverPercent = formatNumber(carryoverBps / 100, 2);

  return (
    <Box twClassName="gap-4" testID={REFERRAL_INFO_SECTION_TEST_IDS.VIP}>
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('rewards.referral.info.vip_title')}
      </Text>

      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-6">
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.referral.info.vip_referrals_label')}
          </Text>
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            testID={REFERRAL_INFO_SECTION_TEST_IDS.VIP_REFERRALS_VALUE}
          >
            {dashboard.volume.referrals}/{dashboard.volume.referralsCap}
          </Text>
        </Box>
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.referral.info.vip_revenue_share_label')}
          </Text>
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            testID={REFERRAL_INFO_SECTION_TEST_IDS.VIP_REVENUE_SHARE_VALUE}
          >
            {carryoverPercent}%
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ReferralInfoSection;
