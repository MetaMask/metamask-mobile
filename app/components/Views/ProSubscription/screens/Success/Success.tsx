import React, { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  BannerAlert,
  BannerAlertSeverity,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { SuccessTestIds } from './Success.testIds';

interface SuccessProps {
  onSuccess: () => void;
  isContinuing?: boolean;
  continueError?: string;
}

const Success = ({
  onSuccess,
  isContinuing = false,
  continueError,
}: SuccessProps) => {
  // BannerAlert has no alert role, and VoiceOver ignores live regions.
  // Announce the failure so focus can stay on Continue (WCAG 4.1.3).
  useEffect(() => {
    if (!continueError) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(continueError);
  }, [continueError]);

  return (
    <Box
      className="flex-1 bg-background-default"
      testID={SuccessTestIds.CONTAINER}
    >
      {/* Icon placeholder — centred in remaining space */}
      <Box className="flex-1 items-center justify-center">
        <Box
          className="w-28 h-28 rounded-2xl bg-background-muted items-center justify-center"
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
      <Box className="px-4 pb-2 gap-y-6">
        <Box className="gap-y-2">
          <Text
            variant={TextVariant.DisplayMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            className="w-[85%]"
            testID={SuccessTestIds.TITLE}
          >
            {strings('pro_subscription.success.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={SuccessTestIds.DESCRIPTION}
          >
            {strings('pro_subscription.success.description')}
          </Text>
        </Box>

        {continueError ? (
          <BannerAlert
            severity={BannerAlertSeverity.Danger}
            description={continueError}
            testID={SuccessTestIds.CONTINUE_ERROR}
          />
        ) : null}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onSuccess}
          isLoading={isContinuing}
          isDisabled={isContinuing}
          isFullWidth
          testID={SuccessTestIds.CTA_BUTTON}
        >
          {strings('pro_subscription.success.cta')}
        </Button>
      </Box>
    </Box>
  );
};

export default Success;
