import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import { ONDO_GM_REQUIRED_QUALIFIED_DAYS } from '../../utils/ondoCampaignConstants';

export const ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS = {
  CONTAINER: 'ondo-not-eligible-sheet-container',
  TITLE: 'ondo-not-eligible-sheet-title',
  BODY: 'ondo-not-eligible-sheet-body',
  CANCEL: 'ondo-not-eligible-sheet-cancel',
  CONFIRM: 'ondo-not-eligible-sheet-confirm',
} as const;

interface OndoNotEligibleSheetProps {
  onClose: () => void;
  onConfirm: () => void;
}

const OndoNotEligibleSheet: React.FC<OndoNotEligibleSheetProps> = ({
  onClose,
  onConfirm,
}) => (
  <BottomSheet
    onClose={onClose}
    testID={ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CONTAINER}
  >
    <Box twClassName="px-4 pb-4">
      {/* Close button */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="justify-end mb-4"
      >
        <ButtonIcon
          iconName={IconName.Close}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onClose}
          testID="ondo-not-eligible-sheet-close"
        />
      </Box>

      {/* Warning icon */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
      </Box>

      {/* Title */}
      <Box alignItems={BoxAlignItems.Center} twClassName="mb-4">
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          testID={ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.TITLE}
        >
          {strings('rewards.ondo_campaign_not_eligible.title')}
        </Text>
      </Box>

      {/* Body */}
      <Box twClassName="mb-6">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.BODY}
        >
          {strings('rewards.ondo_campaign_not_eligible.body', {
            days: ONDO_GM_REQUIRED_QUALIFIED_DAYS,
          })}
        </Text>
      </Box>

      {/* Buttons */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onClose}
          twClassName="flex-1"
          testID={ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CANCEL}
        >
          {strings('rewards.ondo_campaign_not_eligible.cancel')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onConfirm}
          twClassName="flex-1"
          testID={ONDO_NOT_ELIGIBLE_SHEET_TEST_IDS.CONFIRM}
        >
          {strings('rewards.ondo_campaign_not_eligible.confirm')}
        </Button>
      </Box>
    </Box>
  </BottomSheet>
);

export default OndoNotEligibleSheet;
