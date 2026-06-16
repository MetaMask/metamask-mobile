import React, { useRef, useCallback } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { NewUserSheetSelectorsIDs } from './NewUserSheet.testIds';
import NotifCard from '../NotifCard';

export interface NewUserSheetProps {
  isVisible: boolean;
  onClose: (hasPendingAction?: boolean) => void;
  onYes?: () => void;
  onNotNow?: () => void;
  testID?: string;
}

const NewUserSheet: React.FC<NewUserSheetProps> = ({
  isVisible,
  onClose,
  onYes,
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
      shouldNavigateBack={false}
      onClose={onClose}
      testID={testID ?? NewUserSheetSelectorsIDs.CONTAINER}
    >
      <Box twClassName="pb-5 pt-0">
        <Box twClassName="mb-1 items-end pr-2">
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSizes.Lg}
            onPress={() => bottomSheetRef.current?.onCloseBottomSheet()}
          />
        </Box>
        <Box twClassName="mb-2 px-6">
          <NotifCard />
        </Box>

        <Box twClassName="px-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="mb-2 text-center"
            testID={NewUserSheetSelectorsIDs.TITLE}
          >
            {strings('notifications.push_onboarding.new_user.title')}
          </Text>

          <Text
            variant={TextVariant.BodyMd}
            twClassName="mb-7 text-center text-alternative"
            testID={NewUserSheetSelectorsIDs.BODY}
          >
            {strings('notifications.push_onboarding.new_user.body')}
          </Text>

          <Box twClassName="gap-3">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleYes}
              twClassName="rounded-xl"
              testID={NewUserSheetSelectorsIDs.BUTTON_YES}
            >
              {strings('notifications.push_onboarding.new_user.button_yes')}
            </Button>
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
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default NewUserSheet;
