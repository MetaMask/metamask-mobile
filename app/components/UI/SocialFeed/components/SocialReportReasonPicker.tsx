import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  RadioButton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
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
}) => (
  <Box twClassName="px-4 pb-10">
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextDefault}
      twClassName="mb-4"
    >
      {strings('social_leaderboard.entry_options.report_reason_description')}
    </Text>
    <Box gap={4}>
      {SOCIAL_REPORT_REASONS.map((reason) => (
        <RadioButton
          key={reason}
          label={strings(
            `social_leaderboard.entry_options.report_reasons.${reason}`,
          )}
          isChecked={selectedReason === reason}
          onPress={() => onSelectReason(reason)}
          touchableOpacityProps={{
            testID: getSocialEntryReportReasonTestId(reason),
          }}
        />
      ))}
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

export default SocialReportReasonPicker;
