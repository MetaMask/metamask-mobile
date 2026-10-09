import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Card,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ProHubTestIds } from '../../ProHub.testIds';

interface PhysicalCardBannerProps {
  onPress?: () => void;
  isTrialing?: boolean;
  cashbackRate: string;
}

const PhysicalCardBanner = ({
  onPress,
  isTrialing = false,
  cashbackRate,
}: PhysicalCardBannerProps) => {
  const title = isTrialing
    ? strings('pro_hub.physical_card.trial_title', { rate: cashbackRate })
    : strings('pro_hub.physical_card.title');
  const description = isTrialing
    ? strings('pro_hub.physical_card.trial_description')
    : strings('pro_hub.physical_card.description');

  const content = (
    <Card twClassName="w-full bg-background-subsection border-0 rounded-xl p-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-x-3"
      >
        <Box twClassName="w-14 h-10 rounded-md bg-background-muted shrink-0" />

        <Box twClassName="flex-1 gap-y-0.5">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={ProHubTestIds.PHYSICAL_CARD_TITLE}
          >
            {title}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={ProHubTestIds.PHYSICAL_CARD_DESCRIPTION}
          >
            {description}
          </Text>
        </Box>

        {isTrialing ? null : (
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
            twClassName="shrink-0"
          />
        )}
      </Box>
    </Card>
  );

  if (isTrialing || onPress === undefined) {
    return (
      <Box
        accessible
        accessibilityLabel={title}
        testID={ProHubTestIds.PHYSICAL_CARD_BANNER}
      >
        {content}
      </Box>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={ProHubTestIds.PHYSICAL_CARD_BANNER}
    >
      {content}
    </TouchableOpacity>
  );
};

export default PhysicalCardBanner;
