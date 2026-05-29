import React, { useRef, useCallback } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ExistingUserSheetSelectorsIDs } from './ExistingUserSheet.testIds';

export interface ExistingUserSheetProps {
  isVisible: boolean;
  onClose: (hasPendingAction?: boolean) => void;
  onConfirm?: () => void;
  onNotNow?: () => void;
  testID?: string;
}

const ExistingUserSheet: React.FC<ExistingUserSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  onNotNow,
  testID,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const closeWithAction = useCallback((action?: () => void) => {
    const callback = () => action?.();
    if (!bottomSheetRef.current) {
      callback();
      return;
    }
    bottomSheetRef.current.onCloseBottomSheet(callback);
  }, []);

  const handleConfirm = useCallback(() => {
    closeWithAction(onConfirm);
  }, [closeWithAction, onConfirm]);

  const handleNotNow = useCallback(() => {
    closeWithAction(onNotNow);
  }, [closeWithAction, onNotNow]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID ?? ExistingUserSheetSelectorsIDs.CONTAINER}
    >
      <Box twClassName="px-6 pb-8 pt-6">
        <Text
          variant={TextVariant.HeadingMd}
          twClassName="mb-3 text-center"
          testID={ExistingUserSheetSelectorsIDs.TITLE}
        >
          {strings('notifications.push_onboarding.existing_user.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="mb-6 text-center text-alternative"
          testID={ExistingUserSheetSelectorsIDs.BODY}
        >
          {strings('notifications.push_onboarding.existing_user.body')}
        </Text>

        <Box
          twClassName="mb-6 rounded-xl bg-section p-4"
          testID={ExistingUserSheetSelectorsIDs.CONSENT_CARD}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            twClassName="mb-2"
          >
            {strings('notifications.push_onboarding.existing_user.card_title')}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings(
              'notifications.push_onboarding.existing_user.card_description',
            )}
          </Text>
        </Box>

        <Box twClassName="gap-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleConfirm}
            twClassName="rounded-xl"
            testID={ExistingUserSheetSelectorsIDs.BUTTON_CONFIRM}
          >
            {strings(
              'notifications.push_onboarding.existing_user.button_confirm',
            )}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={handleNotNow}
            twClassName="rounded-xl"
            testID={ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW}
          >
            {strings(
              'notifications.push_onboarding.existing_user.button_not_now',
            )}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ExistingUserSheet;
