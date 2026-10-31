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
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';
import NotifCard from '../../../../UI/Notification/NotifCard';

export interface NewUserSheetProps {
  isVisible: boolean;
  onClose: (hasPendingAction?: boolean) => void;
  onYes?: () => void;
  onNotNow?: () => void;
  testID?: string;
  /** Optional heading override. Defaults to the push-onboarding copy. */
  title?: string;
  /** Optional body override. Defaults to the push-onboarding copy. */
  body?: string;
  /** Optional primary-button label override. */
  yesLabel?: string;
  /** Whether to render the notification preview card. Defaults to true. */
  showPreview?: boolean;
  /** Optional notification-preview content overrides. */
  previewTitle?: string;
  previewMessage?: string;
  previewTimestamp?: string;
}

const NewUserSheet: React.FC<NewUserSheetProps> = ({
  isVisible,
  onClose,
  onYes,
  onNotNow,
  testID,
  title = strings('notifications.push_onboarding.new_user.title'),
  body = strings('notifications.push_onboarding.new_user.body'),
  yesLabel = strings('notifications.push_onboarding.new_user.button_yes'),
  showPreview = true,
  previewTitle,
  previewMessage,
  previewTimestamp,
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

  const handleYes = useCallback(() => {
    closeWithAction(onYes);
  }, [closeWithAction, onYes]);

  const handleNotNow = useCallback(() => {
    closeWithAction(onNotNow);
  }, [closeWithAction, onNotNow]);

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      testID={testID ?? NewUserSheetSelectorsIDs.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: NewUserSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      />
      {showPreview && (
        <Box twClassName="mb-2 px-6">
          <NotifCard
            title={previewTitle}
            message={previewMessage}
            timestamp={previewTimestamp}
          />
        </Box>
      )}

      <Box twClassName="px-4">
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="mb-2 text-center"
          testID={NewUserSheetSelectorsIDs.TITLE}
        >
          {title}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="mb-7 text-center text-alternative"
          testID={NewUserSheetSelectorsIDs.BODY}
        >
          {body}
        </Text>
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: yesLabel,
          size: ButtonSize.Lg,
          onPress: handleYes,
          testID: NewUserSheetSelectorsIDs.BUTTON_YES,
        }}
      />
      <Box twClassName="px-4 pt-3">
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleNotNow}
          testID={NewUserSheetSelectorsIDs.BUTTON_NOT_NOW}
        >
          {strings('notifications.push_onboarding.new_user.button_not_now')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default NewUserSheet;
