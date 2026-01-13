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
import { strings } from '../../../../../locales/i18n';
import { TokenI } from '../../Tokens/types';

interface PendingMerklRewardsProps {
  asset: TokenI;
  claimableReward: string | null;
  claimableRewardFiat: string | null;
}

/**
 * Component to display pending Merkl rewards information (annual bonus and claimable bonus)
 */
const PendingMerklRewards: React.FC<PendingMerklRewardsProps> = ({
  asset,
  claimableReward,
  claimableRewardFiat,
}) => (
    <Box twClassName="px-4">
      {/* Annual Bonus Section */}
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
          {/* Calendar Icon */}
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="h-10 w-10 rounded-full bg-muted mr-3"
          >
            <Icon name={IconName.Calendar} size={IconSize.Md} />
          </Box>

          {/* Annual Bonus Text */}
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-default"
            >
              {strings('asset_overview.merkl_rewards.annual_bonus')}
            </Text>
          </Box>
        </Box>

        {/* Annual Bonus Value with Arrow */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-default mr-2"
          >
            ~$20.00
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            twClassName="text-icon-alternative opacity-50"
          />
        </Box>
      </Box>

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
                twClassName="text-text-alternative"
              >
                {claimableReward} {asset.symbol}
              </Text>
            </Box>
          </Box>

          {/* Fiat Value Display */}
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="px-4 py-2 rounded-full border border-default bg-default"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="text-text-default"
            >
              {claimableRewardFiat || '$0.00'}
            </Text>
          </Box>
        </Box>
      )}

      {/* Border line under the entire balance section */}
      <Box twClassName="border-b border-muted" />
    </Box>
  );

export default PendingMerklRewards;
