import React, { useRef } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { SendAlertModalProps } from './send-alert-modal.types';

export const SendAlertModal = ({
  isOpen,
  title,
  errorMessage,
  onAcknowledge,
  onClose,
}: SendAlertModalProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  if (!isOpen) {
    return null;
  }

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="px-4 pt-4 pb-2"
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
        <Text variant={TextVariant.HeadingMd}>{title}</Text>
        <Text variant={TextVariant.BodyMd} twClassName="text-center">
          {errorMessage}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[
          {
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            label: strings('send.cancel'),
            onPress: onClose,
            testID: 'send-alert-modal-cancel-button',
          },
          {
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            label: strings('send.i_understand'),
            onPress: onAcknowledge,
            testID: 'send-alert-modal-acknowledge-button',
          },
        ]}
      />
    </BottomSheet>
  );
};
