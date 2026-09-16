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
import { removeAccount } from '../../../../../util/accounts/removeAccount';
import { RemoveAccountSelectors } from './RemoveAccount.testIds';

/**
 * Navigation params for the remove-account confirmation sheet.
 */
interface RootNavigationParamList extends ParamListBase {
  RemoveAccount: {
    account: InternalAccount;
    accountGroup?: AccountGroupObject;
  };
}

type RemoveAccountRouteProp = RouteProp<
  RootNavigationParamList,
  'RemoveAccount'
>;

/**
 * Confirmation bottom sheet shown when the user taps remove on an account row
 * in Manage Accounts. Today it is reached for removable (imported private key)
 * accounts. Confirms before the account is removed.
 *
 * Design: Account management Figma — "BottomSheet" alert dialog
 * (`TitleAlert` header region, optional content, vertical danger/secondary
 * footer buttons).
 */
const RemoveAccount = () => {
  const route = useRoute<RemoveAccountRouteProp>();
  const navigation = useNavigation();
  const { account, accountGroup } = route.params;

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRemove = useCallback(async () => {
    handleClose();
    await removeAccount({
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
    testID: RemoveAccountSelectors.CANCEL_BUTTON,
  };

  const removeButtonProps = {
    children: strings('accounts.remove_account_alert_remove_btn'),
    size: ButtonSize.Lg,
    isFullWidth: true,
    isDanger: true,
    onPress: handleRemove,
    testID: RemoveAccountSelectors.REMOVE_BUTTON,
  };

  return (
    <BottomSheet
      onClose={handleClose}
      testID={RemoveAccountSelectors.CONTAINER}
    >
      <TitleAlert
        severity="danger"
        title={strings('accounts.remove_account_title_with_account_name', {
          accountName: accountGroup?.metadata.name,
        })}
        description={strings('accounts.remove_account_warning')}
        twClassName="px-4 pt-2 pb-4"
        testID={RemoveAccountSelectors.WARNING}
      />
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        primaryButtonProps={removeButtonProps}
        secondaryButtonProps={cancelButtonProps}
      />
    </BottomSheet>
  );
};

export default RemoveAccount;
