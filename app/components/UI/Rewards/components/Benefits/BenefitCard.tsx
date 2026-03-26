import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes.ts';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { Image, TouchableOpacity } from 'react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants.ts';
import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SubscriptionBenefitDto } from '../../../../../core/Engine/controllers/rewards-controller/types.ts';

interface Props {
  benefit: SubscriptionBenefitDto;
}

const BenefitCard = ({ benefit }: Props) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      style={tw.style('bg-section rounded-lg p-4 h-[132px]')}
      onPress={() =>
        NavigationService.navigation.navigate(Routes.BENEFIT_DETAILS_VIEW, {
          benefit,
        })
      }
      activeOpacity={0.7}
    >
      <Box twClassName="flex-row items-start gap-4">
        <Box twClassName="w-[78px] h-[78px] rounded-lg bg-muted overflow-hidden items-center justify-center">
          <Image
            source={{ uri: benefit.thumbnail }}
            style={tw.style('w-full h-full rounded-lg')}
            resizeMode="contain"
            testID={REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}
          />
        </Box>

        <Box twClassName="flex-1 justify-between h-full">
          <Box>
            <Box twClassName="flex-row items-center gap-1">
              <Text
                variant={TextVariant.HeadingSm}
                twClassName="text-default flex-1"
                numberOfLines={1}
              >
                {benefit.longTitle}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative"
              numberOfLines={3}
            >
              {benefit.shortDescription}
            </Text>
          </Box>
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default BenefitCard;
