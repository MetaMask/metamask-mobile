import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { toHex } from '@metamask/controller-utils';
import { selectAccountGroupsByWallet } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectHiddenAccountGroupIds } from '../../../selectors/multichainAccounts/manageAccounts';
import { selectAvatarAccountType } from '../../../selectors/settings';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import { forgetLedger } from '../../../core/Ledger/Ledger';
import { forgetQrDevice } from '../../../core/QrKeyring/QrKeyring';
import Engine from '../../../core/Engine';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { strings } from '../../../../locales/i18n';
import useToggleAccountGroupHidden from './hooks/useToggleAccountGroupHidden';
import type { ManageAccountsSection } from './ManageAccountsView';
import { ManageAccountRowVariant } from './components/ManageAccountRow';
import type { AccountAvatarVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

/**
 * Dependencies injected into `useManageAccountsView`.
 */
interface UseManageAccountsViewDeps {
  /**
   * Opens the delete-account confirmation sheet for an imported account.
   */
  navigateToDeleteAccount?: (account: InternalAccount) => void;
}

/**
 * Keyring types representing hardware wallet devices.
 */
const HARDWARE_KEYRING_TYPES = new Set<string>([
  ExtendedKeyringTypes.qr,
  ExtendedKeyringTypes.oneKey,
  ExtendedKeyringTypes.ledger,
]);

/**
 * Returns whether a wallet is a hardware keyring wallet.
 *
 * @param wallet - The account wallet object.
 * @returns True if the wallet is backed by a hardware keyring.
 */
const isHardwareKeyringWallet = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Keyring &&
  HARDWARE_KEYRING_TYPES.has(wallet.metadata.keyring.type as string);

/**
 * Returns whether a wallet is an imported private key keyring wallet.
 *
 * @param wallet - The account wallet object.
 * @returns True if the wallet is backed by a simple/private-key keyring.
 */
const isPrivateKeyWallet = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Keyring &&
  (wallet.metadata.keyring.type as string) === ExtendedKeyringTypes.simple;

/**
 * Determines the row variant (trailing actions) for a wallet.
 * - Entropy / HD: Hide toggle only.
 * - Hardware: Hide toggle and remove action.
 * - Imported private key: Remove action only.
 * - Snap / unknown: No trailing action.
 *
 * @param wallet - The account wallet object.
 * @returns The row action variant.
 */
const getWalletRowVariant = (
  wallet: AccountWalletObject,
): ManageAccountRowVariant => {
  switch (wallet.type) {
    case AccountWalletType.Entropy:
      return ManageAccountRowVariant.Hide;
    case AccountWalletType.Snap:
      return ManageAccountRowVariant.None;
    case AccountWalletType.Keyring:
      if (
        (wallet.metadata.keyring.type as string) === ExtendedKeyringTypes.hd
      ) {
        return ManageAccountRowVariant.Hide;
      }
      if (isPrivateKeyWallet(wallet)) {
        return ManageAccountRowVariant.Remove;
      }
      if (isHardwareKeyringWallet(wallet)) {
        return ManageAccountRowVariant.HideAndRemove;
      }
      return ManageAccountRowVariant.None;
    default:
      return ManageAccountRowVariant.None;
  }
};

/**
 * Returns whether the wallet's entropy is locked (seed phrase behind password).
 *
 * @param wallet - The account wallet object.
 * @returns True if entropy/SRP wallet, false otherwise.
 */
const isWalletLocked = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Entropy;

/**
 * Returns whether the wallet section displays the "Add account" footer.
 * Allowed for entropy and hardware wallets.
 *
 * @param wallet - The account wallet object.
 * @returns True if the section should show the add account footer.
 */
const showsWalletAddAccountFooter = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Entropy || isHardwareKeyringWallet(wallet);

/**
 * Removes a hardware account, clears permissions, updates selected account
 * if needed, and forgets the device if no accounts remain on the keyring.
 *
 * @param options - Account address and keyring type.
 */
const removeHardwareAccount = async ({
  address,
  keyringType,
}: {
  address: string;
  keyringType: string;
}): Promise<void> => {
  const { AccountsController, KeyringController } = Engine.context;
  const hexAddress = toHex(address);
  const selectedAccountId =
    AccountsController.state.internalAccounts.selectedAccount;
  const selectedAddress =
    AccountsController.state.internalAccounts.accounts[selectedAccountId]
      ?.address;
  const wasSelected =
    Boolean(selectedAddress) && toHex(selectedAddress) === hexAddress;

  await removeAccountsFromPermissions([hexAddress]);
  await KeyringController.removeAccount(hexAddress);

  if (wasSelected) {
    const accounts = await KeyringController.getAccounts();
    if (accounts.length > 0) {
      Engine.setSelectedAddress(accounts[0]);
    }
  }

  const updatedKeyring = KeyringController.state.keyrings.find(
    (keyring) => keyring.type === keyringType,
  );
  const shouldForgetDevice =
    !updatedKeyring || updatedKeyring.accounts.length === 0;
  if (!shouldForgetDevice) {
    return;
  }

  if (keyringType === ExtendedKeyringTypes.ledger) {
    await forgetLedger();
    return;
  }

  if (keyringType === ExtendedKeyringTypes.qr) {
    await forgetQrDevice();
  }
};

/**
 * Result shape returned by `useManageAccountsView`.
 */
interface UseManageAccountsViewResult {
  sections: ManageAccountsSection[];
  isHiddenByGroupId: Partial<Record<AccountGroupId, boolean>>;
  onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
  onRemoveAccount: (groupId: AccountGroupId) => void;
  onAddAccount: (walletName: string) => void;
  avatarAccountType: AccountAvatarVariant;
}

/**
 * Hook providing section data, hidden state map, and action handlers for the
 * Manage Accounts screen.
 *
 * @param deps - Injected dependencies (e.g. navigation handlers).
 * @returns The view model and handlers for ManageAccountsView.
 */
const useManageAccountsView = (
  deps: UseManageAccountsViewDeps = {},
): UseManageAccountsViewResult => {
  const { navigateToDeleteAccount } = deps;
  const accountSections = useSelector(selectAccountGroupsByWallet);
  const hiddenGroupIds = useSelector(
    selectHiddenAccountGroupIds,
  ) as AccountGroupId[];
  const internalAccountsById = useSelector(selectInternalAccountsById);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const { toggleHidden } = useToggleAccountGroupHidden();

  const sections = useMemo(
    () =>
      accountSections.map((section) => {
        const variant = getWalletRowVariant(section.wallet);
        return {
          walletName: section.title,
          groups: section.data,
          walletId: section.wallet.id,
          rowVariantByGroupId: section.data.reduce<
            Partial<Record<AccountGroupId, ManageAccountRowVariant>>
          >((accumulator, group) => {
            accumulator[group.id] = variant;
            return accumulator;
          }, {}),
          isLocked: isWalletLocked(section.wallet),
          showsAddAccountFooter: showsWalletAddAccountFooter(section.wallet),
        };
      }),
    [accountSections],
  );

  const isHiddenByGroupId = useMemo(
    () =>
      hiddenGroupIds.reduce<Partial<Record<AccountGroupId, boolean>>>(
        (accumulator, groupId) => {
          accumulator[groupId] = true;
          return accumulator;
        },
        {},
      ),
    [hiddenGroupIds],
  );

  /**
   * Toggles the hidden state of an account group.
   */
  const onToggleHidden = useCallback(
    (groupId: AccountGroupId) => {
      toggleHidden(groupId);
    },
    [toggleHidden],
  );

  /**
   * Handles removing an account group (opens delete confirmation for imported
   * accounts, shows alert and removes for hardware accounts).
   */
  const onRemoveAccount = useCallback(
    (groupId: AccountGroupId) => {
      const section = accountSections.find(({ data }) =>
        data.some((group) => group.id === groupId),
      );
      const group = section?.data.find(({ id }) => id === groupId);
      if (
        !section ||
        !group ||
        section.wallet.type !== AccountWalletType.Keyring
      ) {
        return;
      }

      if (isPrivateKeyWallet(section.wallet)) {
        // Imported group → delete-account confirmation sheet.
        const accountId = group.accounts[0];
        const account = accountId ? internalAccountsById[accountId] : undefined;
        if (account) {
          navigateToDeleteAccount?.(account);
        }
        return;
      }

      if (isHardwareKeyringWallet(section.wallet)) {
        // Hardware group → confirm Alert, then remove from the keyring.
        const accountId = group.accounts[0];
        const account = accountId ? internalAccountsById[accountId] : undefined;
        if (!account) {
          return;
        }
        const { type: keyringType } = section.wallet.metadata.keyring;
        Alert.alert(
          strings('accounts.remove_hardware_account'),
          strings('accounts.remove_hw_account_alert_description'),
          [
            {
              text: strings('accounts.remove_account_alert_cancel_btn'),
              style: 'cancel',
            },
            {
              text: strings('accounts.remove_account_alert_remove_btn'),
              onPress: async () => {
                await removeHardwareAccount({
                  address: account.address,
                  keyringType,
                });
              },
            },
          ],
        );
        return;
      }
    },
    [accountSections, internalAccountsById, navigateToDeleteAccount],
  );

  /**
   * Handler for the add-account footer button.
   */
  const onAddAccount = useCallback((_walletName: string) => undefined, []);

  return {
    sections,
    isHiddenByGroupId,
    onToggleHidden,
    onRemoveAccount,
    onAddAccount,
    avatarAccountType,
  };
};

export default useManageAccountsView;
