///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import ApprovalModal from '../ApprovalModal';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../../../core/RPCMethods/RPCMethodMiddleware';
import {
  SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON,
  SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL,
  SNAP_ACCOUNT_CUSTOM_NAME_CANCEL_BUTTON,
  SNAP_ACCOUNT_CUSTOM_NAME_INPUT,
} from './SnapAccountCustomNameApproval.constants';
import styleSheet from './SnapAccountCustomNameApproval.styles';
import { useStyles } from '../../hooks/useStyles';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { useSelector } from 'react-redux';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { getUniqueAccountName } from '../../../core/SnapKeyring/utils/getUniqueAccountName';

const SnapAccountCustomNameApproval = () => {
  const { approvalRequest, onConfirm, onReject } = useApprovalRequest();
  const internalAccounts = useSelector(selectInternalAccounts);
  const [accountName, setAccountName] = useState<string>('');
  const [isNameTaken, setIsNameTaken] = useState<boolean>(false);

  const { styles } = useStyles(styleSheet, {});

  const onAddAccountPressed = () => {
    if (!isNameTaken) {
      onConfirm(undefined, { success: true, name: accountName });
    }
  };

  const checkIfNameTaken = (name: string) =>
    internalAccounts.some((account) => account.metadata.name === name);

  useEffect(() => {
    const suggestedName =
      approvalRequest?.requestData?.snapSuggestedAccountName;
    const initialName = suggestedName
      ? getUniqueAccountName(internalAccounts, suggestedName)
      : '';
    setAccountName(initialName);
  }, [approvalRequest, internalAccounts]);

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
    onPress: onAddAccountPressed,
    testID: SNAP_ACCOUNT_CUSTOM_NAME_ADD_ACCOUNT_BUTTON,
    isDisabled: isNameTaken,
  };

  const handleNameChange = (text: string) => {
    setAccountName(text);
    setIsNameTaken(checkIfNameTaken(text));
  };

  return (
    <ApprovalModal
      isVisible={
        approvalRequest?.type ===
        SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount
      }
      avoidKeyboard
      onCancel={onReject}
    >
      <View testID={SNAP_ACCOUNT_CUSTOM_NAME_APPROVAL} style={styles.root}>
        <SheetHeader
          title={strings('snap_account_custom_name_approval.title')}
        />
        <Text style={styles.inputTitle} variant={TextVariant.BodyMDBold}>
          {strings('snap_account_custom_name_approval.input_title')}
        </Text>
        <TextInput
          style={styles.input}
          value={accountName}
          onChangeText={handleNameChange}
          testID={SNAP_ACCOUNT_CUSTOM_NAME_INPUT}
        />
        {isNameTaken && (
          <Text variant={TextVariant.BodySM} color={TextColor.Error}>
            {strings('snap_account_custom_name_approval.name_taken_message')}
          </Text>
        )}
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
