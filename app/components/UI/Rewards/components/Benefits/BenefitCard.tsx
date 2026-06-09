import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes.ts';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Image, TouchableOpacity } from 'react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants.ts';
import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SubscriptionBenefitDto } from '../../../../../core/Engine/controllers/rewards-controller/types.ts';
import { formatDateRemaining } from '../../utils/formatUtils.ts';

interface Props {
  benefit: SubscriptionBenefitDto;
}

const BenefitCard = ({ benefit }: Props) => {
  const tw = useTailwind();
  const benefitImageTestId = `${REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}-${benefit.id}`;

  const remainingTime =
    benefit.actionDate == null
      ? null
      : formatDateRemaining(benefit.actionDate, Date.now());

  return (
    <TouchableOpacity
      style={tw.style('bg-section rounded-lg p-4 h-[154px]')}
      onPress={() =>
        NavigationService.navigation.navigate(Routes.REWARD_BENEFIT_FULL_VIEW, {
          benefit,
        })
      }
      activeOpacity={0.7}
    >
      <Box gap={4} twClassName="flex-row items-start">
        <Box twClassName="w-[78px] h-[78px] rounded-lg bg-muted overflow-hidden items-center justify-center">
          <Image
            source={{ uri: benefit.thumbnail }}
            style={tw.style('w-full h-full rounded-lg')}
            resizeMode="cover"
            testID={benefitImageTestId}
          />
        </Box>

        <Box twClassName="flex-1 gap-1">
          <Text
            variant={TextVariant.HeadingSm}
            twClassName="text-default"
            numberOfLines={1}
          >
            {benefit.longTitle}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            numberOfLines={3}
          >
            {benefit.shortDescription}
          </Text>
          {remainingTime != null && (
            <Box
              gap={1}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Icon
                name={IconName.Clock}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {remainingTime}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

export default BenefitCard;
