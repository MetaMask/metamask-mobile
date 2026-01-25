import {
  Text,
  TextVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import React, { useCallback, useRef } from 'react';
import { ModalAction } from '../../../Rewards/components/RewardsBottomSheetModal';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';

interface ConfirmModalParams {
  title: string;
  description: string;
  icon: IconName;
  confirmAction: ModalAction;
}

const ConfirmModal = () => {
  const { title, description, icon, confirmAction } =
    useParams<ConfirmModalParams>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleCancel = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, [sheetRef]);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(confirmAction.onPress);
  }, [sheetRef, confirmAction.onPress]);

  const renderIcon = () => (
    <Icon
      name={icon}
      size={IconSize.Xl}
      color={IconColor.IconDefault}
      testID="confirm-modal-icon"
    />
  );

  const renderTitle = () => (
    <Text
      variant={TextVariant.HeadingMd}
      twClassName="text-center text-default"
      testID="confirm-modal-title"
    >
      {title}
    </Text>
  );

  const renderDescription = () => (
    <Text
      variant={TextVariant.BodyMd}
      twClassName="text-center text-alternative px-6"
      testID="confirm-modal-description"
    >
      {description}
    </Text>
  );

  const renderActions = () => (
    <Box twClassName="w-full mt-2" testID="confirm-modal-actions">
      <Button
        onPress={handleConfirm}
        variant={confirmAction.variant || ButtonVariant.Primary}
        size={ButtonSize.Lg}
        twClassName="w-full"
      >
        {confirmAction.label || strings('card.card_onboarding.confirm_button')}
      </Button>
    </Box>
  );

  return (
    <BottomSheet ref={sheetRef} testID="confirm-modal">
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="py-2 px-4 flex flex-col gap-3"
      >
        <Box twClassName="w-full flex-row justify-end -mt-2">
          <ButtonIcon
            onPress={handleCancel}
            iconName={IconName.Close}
            iconProps={{
              color: IconColor.IconDefault,
            }}
            testID="confirm-modal-close-button"
          />
        </Box>

        {renderIcon()}
        {renderTitle()}
        {renderDescription()}
        {renderActions()}
      </Box>
    </BottomSheet>
  );
};

export default ConfirmModal;
