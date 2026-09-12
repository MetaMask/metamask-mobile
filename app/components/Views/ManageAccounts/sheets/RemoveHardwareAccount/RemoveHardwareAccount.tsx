import React, { useCallback } from 'react';
import {
  useNavigation,
  useRoute,
  type ParamListBase,
  type RouteProp,
} from '@react-navigation/native';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import {
  ButtonSize,
  ButtonsAlignment,
  BottomSheet,
  BottomSheetFooter,
  TitleAlert,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { removeHardwareAccount } from '../../../../../util/accounts/removeHardwareAccount';
import { RemoveHardwareAccountSelectors } from './RemoveHardwareAccount.testIds';

/**
 * Navigation params for the remove-hardware-account confirmation sheet.
 */
interface RootNavigationParamList extends ParamListBase {
  RemoveHardwareAccount: {
    account: InternalAccount;
    accountGroup?: AccountGroupObject;
  };
}

type RemoveHardwareAccountRouteProp = RouteProp<
  RootNavigationParamList,
  'RemoveHardwareAccount'
>;

/**
 * Confirmation bottom sheet shown when the user taps remove on a hardware
 * wallet account in Manage Accounts. Confirms before the account (and its
 * device, when it is the last one on the keyring) is removed.
 *
 * Design: Account management Figma — "BottomSheet" alert dialog
 * (`TitleAlert` header region, optional content, vertical danger/secondary
 * footer buttons).
 */
const RemoveHardwareAccount = () => {
  const route = useRoute<RemoveHardwareAccountRouteProp>();
  const navigation = useNavigation();
  const { account, accountGroup } = route.params;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRemove = useCallback(async () => {
    handleClose();
    await removeHardwareAccount({
      address: account.address,
      keyringType: account.metadata.keyring.type,
    });
    toast({
      title: strings('accounts.account_removed_toast', {
        accountName: accountGroup?.metadata.name,
      }),
      severity: ToastSeverity.Success,
    });
  }, [
    account.address,
    account.metadata.keyring.type,
    accountGroup?.metadata.name,
    handleClose,
  ]);

  const cancelButtonProps = {
    children: strings('accounts.remove_account_alert_cancel_btn'),
    size: ButtonSize.Lg,
    isFullWidth: true,
    onPress: handleClose,
    testID: RemoveHardwareAccountSelectors.CANCEL_BUTTON,
  };

  const removeButtonProps = {
    children: strings('accounts.remove_account_alert_remove_btn'),
    size: ButtonSize.Lg,
    isFullWidth: true,
    isDanger: true,
    onPress: handleRemove,
    testID: RemoveHardwareAccountSelectors.REMOVE_BUTTON,
  };

  return (
    <BottomSheet
      onClose={handleClose}
      testID={RemoveHardwareAccountSelectors.CONTAINER}
    >
      <TitleAlert
        severity="danger"
        title={strings('accounts.remove_account_title_with_account_name', {
          accountName: accountGroup?.metadata.name,
        })}
        description={strings('accounts.remove_account_warning')}
        twClassName="px-4 pt-2 pb-4"
        testID={RemoveHardwareAccountSelectors.WARNING}
      />
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={removeButtonProps}
        secondaryButtonProps={cancelButtonProps}
      />
    </BottomSheet>
  );
};

export default RemoveHardwareAccount;
