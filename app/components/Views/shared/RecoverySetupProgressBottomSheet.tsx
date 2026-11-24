import React, { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal } from 'react-native';
import {
  BottomSheet,
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

export const RECOVERY_SETUP_PROGRESS_TEST_IDS = {
  SHEET: 'mfa-recovery-setup-progress-sheet',
  SPINNER: 'mfa-recovery-setup-progress-spinner',
} as const;

const noop = (): undefined => undefined;

interface RecoverySetupProgressBottomSheetProps {
  /** Defaults to the recovery setup title. */
  title?: string;
}

/**
 * Blocks the screen while passwordless recovery is set up or updated. The
 * caller mounts it while the work runs and unmounts it when done.
 */
const RecoverySetupProgressBottomSheet = ({
  title = strings('mfa.settings.recovery_setup_in_progress_title'),
}: RecoverySetupProgressBottomSheetProps): React.JSX.Element => {
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={noop}
    >
      <BottomSheet
        isInteractable={false}
        keyboardAvoidingViewEnabled={false}
        testID={RECOVERY_SETUP_PROGRESS_TEST_IDS.SHEET}
      >
        <Box twClassName="flex flex-col items-center gap-4 px-4 pt-6 pb-8">
          <ActivityIndicator
            size="large"
            accessibilityRole="progressbar"
            accessibilityLabel={title}
            testID={RECOVERY_SETUP_PROGRESS_TEST_IDS.SPINNER}
          />
          <Text variant={TextVariant.HeadingMd} twClassName="text-center">
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('mfa.settings.recovery_setup_in_progress_description')}
          </Text>
        </Box>
      </BottomSheet>
    </Modal>
  );
};

export default RecoverySetupProgressBottomSheet;
