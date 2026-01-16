import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { TokenI } from '../../../Tokens/types';

interface PendingMerklRewardsProps {
  asset: TokenI;
  claimableReward: string | null;
}

/**
 * Component to display pending Merkl rewards information (annual bonus and claimable bonus)
 */
const PendingMerklRewards: React.FC<PendingMerklRewardsProps> = ({
  asset,
  claimableReward,
}) => {
  // Don't render anything if there's no claimable reward
  if (!claimableReward) {
    return null;
  }

  return (
    <Box twClassName="px-4">
      <Box twClassName="h-px bg-border-muted my-4 mt-6" />

      {/* Annual Bonus Section */}

      {/* Claimable Bonus Section */}
      {claimableReward && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-4"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            {/* Money Bag Icon */}
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="h-10 w-10 rounded-full bg-muted mr-3"
            >
              <Icon name={IconName.MoneyBag} size={IconSize.Md} />
            </Box>

            {/* Claimable Bonus Text and Amount */}
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="text-text-default mb-1"
              >
                {strings('asset_overview.merkl_rewards.claimable_bonus')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-primary-default"
                fontWeight={FontWeight.Medium}
              >
                {strings('asset_overview.merkl_rewards.annual_bonus')}
              </Text>
            </Box>
          </Box>

          {/* Claimable Bonus Amount Display */}
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="px-4 py-2 rounded-xl border border-default bg-default"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-default"
            >
              {claimableReward} {asset.symbol}
            </Text>
          </Box>
        </Box>
      )}

      {/* Horizontal divider line */}
    </Box>
  );
};

export default PendingMerklRewards;
