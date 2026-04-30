import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxBackgroundColor,
  BottomSheet,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
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
import { formatTimeRemaining } from '../../utils/formatUtils';

interface OndoAfterHoursSheetProps {
  onClose: () => void;
  onConfirm?: () => void;
  nextOpenAt: Date | null;
}

const OndoAfterHoursSheet: React.FC<OndoAfterHoursSheetProps> = ({
  onClose,
  onConfirm,
  nextOpenAt,
}) => {
  const countdownText = nextOpenAt ? formatTimeRemaining(nextOpenAt) : null;

  return (
    <BottomSheet onClose={onClose}>
      <Box twClassName="px-4 pb-4">
        {/* Header row: spacer + close button */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.End}
          twClassName="mb-4"
        >
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={onClose}
            testID="ondo-after-hours-sheet-close"
          />
        </Box>

        {/* Clock icon */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Icon name={IconName.AfterHours} size={IconSize.Xl} />
        </Box>

        {/* Title */}
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            testID="ondo-after-hours-sheet-title"
          >
            {strings('rewards.ondo_campaign_after_hours_trading.title')}
          </Text>
        </Box>

        {/* Countdown pill */}
        {countdownText && (
          <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
            <Box
              backgroundColor={BoxBackgroundColor.BackgroundMuted}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="rounded-full px-4 py-2 gap-1"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings(
                  'rewards.ondo_campaign_after_hours_trading.reopens_in_label',
                )}
              </Text>
              <Text variant={TextVariant.BodyMd}>{countdownText}</Text>
            </Box>
          </Box>
        )}

        {/* Description */}
        <Box twClassName="mb-6">
          <Text
            variant={TextVariant.BodyMd}
            testID="ondo-after-hours-sheet-description"
            twClassName="text-center"
          >
            {strings('rewards.ondo_campaign_after_hours_trading.content')}
          </Text>
        </Box>

        {/* Got it CTA */}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onConfirm ?? onClose}
          twClassName="w-full"
          testID="ondo-after-hours-sheet-got-it"
        >
          {strings('rewards.ondo_campaign_after_hours_trading.got_it_button')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default OndoAfterHoursSheet;
