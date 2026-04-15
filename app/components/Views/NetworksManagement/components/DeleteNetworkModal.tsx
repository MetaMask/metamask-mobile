import React, { forwardRef } from 'react';

import {
  Box,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  ButtonSize,
  Text,
  TextVariant,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';

import { NetworksManagementViewSelectorsIDs } from '../NetworksManagementView.testIds';

interface DeleteNetworkModalProps {
  networkName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteNetworkModal = forwardRef<BottomSheetRef, DeleteNetworkModalProps>(
  ({ networkName, onClose, onConfirm }, ref) => {
    const cancelButtonProps = {
      children: strings('accountApproval.cancel'),
      onPress: onClose,
      size: ButtonSize.Lg,
      testID: NetworksManagementViewSelectorsIDs.DELETE_CANCEL_BUTTON,
    };

    const deleteButtonProps = {
      children: strings('app_settings.delete'),
      onPress: onConfirm,
      size: ButtonSize.Lg,
      testID: NetworksManagementViewSelectorsIDs.DELETE_CONFIRM_BUTTON,
    };

    return (
      <BottomSheet
        ref={ref}
        onClose={onClose}
        goBack={onClose}
        testID={NetworksManagementViewSelectorsIDs.DELETE_MODAL}
      >
        <BottomSheetHeader onClose={onClose}>
          {`${strings('app_settings.delete')} ${networkName} ${strings('app_settings.network')}`}
        </BottomSheetHeader>
        <Box alignItems={BoxAlignItems.Center} twClassName="px-4">
          <Text variant={TextVariant.BodyMd} twClassName="text-center mb-4">
            {strings('app_settings.network_delete')}
          </Text>
          <BottomSheetFooter
            secondaryButtonProps={cancelButtonProps}
            primaryButtonProps={deleteButtonProps}
          />
        </Box>
      </BottomSheet>
    );
  },
);

export default DeleteNetworkModal;
