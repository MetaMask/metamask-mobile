import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  SOCIAL_REPORT_REASONS,
  SocialEntryReportReason,
} from '../reportReasons';
import {
  getSocialEntryReportReasonTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from './SocialEntryOptionsBottomSheet.testIds';

export interface SocialReportReasonPickerProps {
  selectedReason: SocialEntryReportReason | null;
  onSelectReason: (reason: SocialEntryReportReason) => void;
  onSubmit: () => void;
}

/** Reason list shared by post reports and profile reports. */
const SocialReportReasonPicker: React.FC<SocialReportReasonPickerProps> = ({
  selectedReason,
  onSelectReason,
  onSubmit,
}) => {
  const tw = useTailwind();

  return (
    <Box twClassName="px-4 pb-10">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        twClassName="mb-4"
      >
        {strings('social_leaderboard.entry_options.report_reason_description')}
      </Text>
      <Box gap={4}>
        {SOCIAL_REPORT_REASONS.map((reason) => {
          const isSelected = selectedReason === reason;
          return (
            <Pressable
              key={reason}
              onPress={() => onSelectReason(reason)}
              style={({ pressed }) => tw.style(pressed && 'opacity-70')}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              testID={getSocialEntryReportReasonTestId(reason)}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={3}
                twClassName="py-1"
              >
                <Box
                  twClassName={`h-6 w-6 rounded-full border ${
                    isSelected ? 'border-primary-default' : 'border-muted'
                  }`}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                >
                  {isSelected ? (
                    <Box twClassName="h-3 w-3 rounded-full bg-primary-default" />
                  ) : null}
                </Box>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Regular}
                >
                  {strings(
                    `social_leaderboard.entry_options.report_reasons.${reason}`,
                  )}
                </Text>
              </Box>
            </Pressable>
          );
        })}
      </Box>
      <Box twClassName="mt-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={selectedReason === null}
          onPress={onSubmit}
          testID={SocialEntryOptionsBottomSheetSelectorsIDs.REPORT_SUBMIT}
        >
          {strings('social_leaderboard.entry_options.submit_report')}
        </Button>
      </Box>
    </Box>
  );
};

export default SocialReportReasonPicker;
