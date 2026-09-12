import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import useManageAccountsView from './useManageAccountsView';
import ManageAccountsView from './ManageAccountsView';

/**
 * Connected Manage Accounts screen — the component registered in the AppFlow
 * navigator (`Routes.MANAGE_ACCOUNTS_VIEW`). Sourcing lives in
 * `useManageAccountsView`; visuals and the prop contract live in the
 * presentational `ManageAccountsView`. Navigation stays at this level and is
 * injected into the hook so its Engine-backed handlers remain testable.
 */
const ManageAccounts = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    sections,
    isHiddenByGroupId,
    onToggleHidden,
    onRemoveAccount,
    onAddAccount,
    avatarAccountType,
  } = useManageAccountsView({
    navigateToDeleteAccount: useCallback(
      (account: InternalAccount) => {
        navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT,
          params: { account },
        });
      },
      [navigation],
    ),
    navigateToRemoveHardwareAccount: useCallback(
      (account: InternalAccount, accountGroup: AccountGroupObject) => {
        navigation.navigate(Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS, {
          screen:
            Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_HARDWARE_ACCOUNT,
          params: { account, accountGroup },
        });
      },
      [navigation],
    ),
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAddWallet = useCallback(() => {
    navigation.navigate(Routes.SHEET.ADD_WALLET);
  }, [navigation]);

  return (
    <ManageAccountsView
      sections={sections}
      isHiddenByGroupId={isHiddenByGroupId}
      onToggleHidden={onToggleHidden}
      onRemoveAccount={onRemoveAccount}
      onAddAccount={onAddAccount}
      onAddWallet={handleAddWallet}
      avatarAccountType={avatarAccountType}
      onBack={handleBack}
    />
  );
};

export default ManageAccounts;
