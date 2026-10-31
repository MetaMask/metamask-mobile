import React, { useRef, useCallback } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { ExistingUserSheetSelectorsIDs } from './ExistingUserSheet.testIds';
import NotifCard from '../../../../UI/Notification/NotifCard';

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

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
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
      onClose={onClose}
      testID={testID ?? ExistingUserSheetSelectorsIDs.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ExistingUserSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />
      <Box twClassName="mb-2 px-6">
        <NotifCard />
      </Box>

      <Box twClassName="px-4">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="mb-2 text-center"
          testID={ExistingUserSheetSelectorsIDs.TITLE}
        >
          {strings('notifications.push_onboarding.existing_user.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="mb-7 text-center text-alternative"
          testID={ExistingUserSheetSelectorsIDs.BODY}
        >
          {strings('notifications.push_onboarding.existing_user.body')}
        </Text>
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings(
            'notifications.push_onboarding.existing_user.button_confirm',
          ),
          size: ButtonSize.Lg,
          onPress: handleConfirm,
          testID: ExistingUserSheetSelectorsIDs.BUTTON_CONFIRM,
        }}
      />
      <Box twClassName="px-4 pt-3">
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleNotNow}
          testID={ExistingUserSheetSelectorsIDs.BUTTON_NOT_NOW}
        >
          {strings(
            'notifications.push_onboarding.existing_user.button_not_now',
          )}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default ExistingUserSheet;
