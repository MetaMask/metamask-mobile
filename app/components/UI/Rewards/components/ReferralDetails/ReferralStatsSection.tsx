import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import MetamaskRewardsPointsImage from '../../../../../images/metamask-rewards-points.svg';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

interface ReferralStatsSectionProps {
  earnedPointsFromReferees?: number;
  earnedPointsFromRefereesLoading?: boolean;
  refereeCount?: number;
  refereeCountLoading?: boolean;
}

const ReferralStatsSection: React.FC<ReferralStatsSectionProps> = ({
  earnedPointsFromReferees = 6200,
  earnedPointsFromRefereesLoading = false,
  refereeCount = 0,
  refereeCountLoading = false,
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
    <Box twClassName="flex-1 gap-2">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Earned from referrals
      </Text>
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
        <MetamaskRewardsPointsImage name="MetamaskRewardsPoints" />
        {earnedPointsFromRefereesLoading ? (
          <Skeleton height={24} width={24} />
        ) : (
          <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Bold}>
            {earnedPointsFromReferees.toLocaleString()}
          </Text>
        )}
      </Box>
    </Box>
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        Referrals
      </Text>
      {refereeCountLoading ? (
        <Skeleton height={24} width={24} />
      ) : (
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Bold}>
          {refereeCount}
        </Text>
      )}
    </Box>
  </Box>
);

export default ReferralStatsSection;
