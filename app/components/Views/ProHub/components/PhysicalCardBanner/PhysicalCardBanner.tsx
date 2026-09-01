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
  onPress: () => void;
}

const PhysicalCardBanner = ({ onPress }: PhysicalCardBannerProps) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={strings('pro_hub.physical_card.title')}
    testID={ProHubTestIds.PHYSICAL_CARD_BANNER}
  >
    <Card twClassName="w-full bg-background-section rounded-xl p-4 border border-border-default">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-x-3"
      >
        <Box twClassName="w-14 h-9 rounded-lg border border-border-default bg-background-default shrink-0" />

        <Box twClassName="flex-1 gap-y-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={ProHubTestIds.PHYSICAL_CARD_TITLE}
          >
            {strings('pro_hub.physical_card.title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={ProHubTestIds.PHYSICAL_CARD_DESCRIPTION}
          >
            {strings('pro_hub.physical_card.description')}
          </Text>
        </Box>

        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          twClassName="shrink-0"
        />
      </Box>
    </Card>
  </TouchableOpacity>
);

export default PhysicalCardBanner;
