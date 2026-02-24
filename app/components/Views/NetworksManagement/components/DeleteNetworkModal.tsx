import React, { forwardRef } from 'react';

import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import BottomSheetFooter from '../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import { ButtonsAlignment } from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../../component-library/components/Buttons/Button/Button.types';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';

import { NetworksManagementViewSelectorsIDs } from '../NetworksManagementView.testIds';

interface DeleteNetworkModalProps {
  networkName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteNetworkModal = forwardRef<BottomSheetRef, DeleteNetworkModalProps>(
  ({ networkName, onClose, onConfirm }, ref) => {
    const cancelButtonProps: ButtonProps = {
      variant: ButtonVariants.Secondary,
      label: strings('accountApproval.cancel'),
      size: ButtonSize.Lg,
      onPress: onClose,
      testID: NetworksManagementViewSelectorsIDs.DELETE_CANCEL_BUTTON,
    };

    const deleteButtonProps: ButtonProps = {
      variant: ButtonVariants.Primary,
      label: strings('app_settings.delete'),
      size: ButtonSize.Lg,
      onPress: onConfirm,
      testID: NetworksManagementViewSelectorsIDs.DELETE_CONFIRM_BUTTON,
    };

    return (
      <BottomSheet
        ref={ref}
        onClose={onClose}
        shouldNavigateBack={false}
        testID={NetworksManagementViewSelectorsIDs.DELETE_MODAL}
      >
        <BottomSheetHeader>
          {`${strings('app_settings.delete')} ${networkName} ${strings('asset_details.network')}`}
        </BottomSheetHeader>
        <Box alignItems={BoxAlignItems.Center} twClassName="px-4">
          <Text variant={TextVariant.BodyMd} twClassName="text-center mb-4">
            {strings('app_settings.network_delete')}
          </Text>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={[cancelButtonProps, deleteButtonProps]}
          />
        </Box>
      </BottomSheet>
    );
  },
);

export default DeleteNetworkModal;
