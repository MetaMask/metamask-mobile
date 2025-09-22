import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import MetamaskRewardsPointsImage from '../../../../../images/rewards/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { strings } from '../../../../../../locales/i18n';

interface ReferralStatsSectionProps {
  earnedPointsFromReferees?: number | null;
  earnedPointsFromRefereesLoading?: boolean;
  refereeCount?: number | null;
  refereeCountLoading?: boolean;
}

const ReferralStatsSection: React.FC<ReferralStatsSectionProps> = ({
  earnedPointsFromReferees = undefined,
  earnedPointsFromRefereesLoading = false,
  refereeCount = undefined,
  refereeCountLoading = false,
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-12">
    <Box twClassName="gap-2">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('rewards.referral_stats_earned_from_referrals')}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2 items-center"
      >
        <MetamaskRewardsPointsImage name="MetamaskRewardsPoints" />

        {earnedPointsFromRefereesLoading ? (
          <Skeleton height={32} width={100} />
        ) : (
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
            {typeof earnedPointsFromReferees === 'number'
              ? earnedPointsFromReferees.toLocaleString()
              : '-'}
          </Text>
        )}
      </Box>
    </Box>

    <Box twClassName="gap-2">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('rewards.referral_stats_referrals')}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2 items-center"
      >
        {refereeCountLoading ? (
          <Skeleton height={32} width={100} />
        ) : (
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
            {typeof refereeCount === 'number'
              ? refereeCount.toLocaleString()
              : '-'}
          </Text>
        )}
      </Box>
    </Box>
  </Box>
);

export default ReferralStatsSection;
