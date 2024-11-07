///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import React from 'react';
import { View } from 'react-native';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../../core/RPCMethods/RPCMethodMiddleware';
import {
  SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON,
  SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL,
  SNAP_ACCOUNT_CUSTOM_NAME_CANCEL_BUTTON,
} from './SnapAccountCustomNameApproval.constants';
import styleSheet from './SnapAccountCustomNameApproval.styles';
import { useStyles } from '../../hooks/useStyles';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button/Button.types';

const SnapAccountCustomNameApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();

  const { styles } = useStyles(styleSheet, {});

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: onReject,
    testID: SNAP_ACCOUNT_CUSTOM_NAME_CANCEL_BUTTON,
  };

  const addAccountButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('snap_account_custom_name_approval.add_account_button'),
    size: ButtonSize.Lg,
    onPress: onConfirm,
    testID: SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON,
  };

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type ===
        SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount
      }
      onCancel={onReject}
    >
      <View testID={SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL} style={styles.root}>
        <SheetHeader
          title={strings('snap_account_custom_name_approval.title')}
        />
        <Text style={styles.description} variant={TextVariant.BodyMD}>
          Account name
        </Text>
        <View style={styles.actionContainer}>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Horizontal}
            buttonPropsArray={[cancelButtonProps, addAccountButtonProps]}
          />
        </View>
      </View>
    </ApprovalModal>
  );
};

export default SnapAccountCustomNameApproval;
///: END:ONLY_INCLUDE_IF
