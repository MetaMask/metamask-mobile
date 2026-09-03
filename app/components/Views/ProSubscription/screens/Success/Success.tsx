import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { SuccessTestIds } from './Success.testIds';

interface SuccessProps {
  onSuccess: () => void;
}

const ALY_NAME = 'Aly';

const Success = ({ onSuccess }: SuccessProps) => (
  <Box
    twClassName="flex-1 bg-background-default"
    testID={SuccessTestIds.CONTAINER}
  >
    {/* Icon placeholder — centred in remaining space */}
    <Box twClassName="flex-1 items-center justify-center">
      <Box
        twClassName="w-28 h-28 rounded-2xl bg-background-muted items-center justify-center"
        testID={SuccessTestIds.ICON_PLACEHOLDER}
      >
        <Icon
          name={IconName.Gift}
          size={IconSize.Xl}
          color={IconColor.IconDefault}
        />
      </Box>
    </Box>

    {/* Title, subtitle and CTA anchored at the bottom */}
    <Box twClassName="px-4 pb-2 gap-y-6">
      <Box twClassName="gap-y-2">
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="w-[85%]"
          testID={SuccessTestIds.TITLE}
        >
          {strings('pro_subscription.success.title', { name: ALY_NAME })}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={SuccessTestIds.DESCRIPTION}
        >
          {strings('pro_subscription.success.description')}
        </Text>
      </Box>

      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onSuccess}
        isFullWidth
        testID={SuccessTestIds.CTA_BUTTON}
      >
        {strings('pro_subscription.success.cta')}
      </Button>
    </Box>
  </Box>
);

export default Success;
