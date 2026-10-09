import React from 'react';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
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
  title?: string;
  content?: string;
  confirmLabel?: string;
  testID?: string;
}

const OndoAfterHoursSheet: React.FC<OndoAfterHoursSheetProps> = ({
  onClose,
  onConfirm,
  nextOpenAt,
  title = strings('rewards.ondo_campaign_after_hours_trading.title'),
  content = strings('rewards.ondo_campaign_after_hours_trading.content'),
  confirmLabel = strings(
    'rewards.ondo_campaign_after_hours_trading.got_it_button',
  ),
  testID = 'ondo-after-hours-sheet',
}) => {
  const countdownText = nextOpenAt ? formatTimeRemaining(nextOpenAt) : null;

  return (
    <BottomSheet onClose={onClose} testID={testID}>
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
            testID={`${testID}-close`}
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
            testID={`${testID}-title`}
          >
            {title}
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
            testID={`${testID}-description`}
            twClassName="text-center"
          >
            {content}
          </Text>
        </Box>

        {/* Got it CTA */}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onConfirm ?? onClose}
          twClassName="w-full"
          testID={`${testID}-got-it`}
        >
          {confirmLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default OndoAfterHoursSheet;
