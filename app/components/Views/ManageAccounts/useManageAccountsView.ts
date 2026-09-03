import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { AccountGroupId, AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { toHex } from '@metamask/controller-utils';
import { selectAccountGroupsByWallet } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsById } from '../../../selectors/accountsController';
import { selectHiddenAccountGroupIds } from '../../../selectors/multichainAccounts/manageAccounts';
import { selectAvatarAccountType } from '../../../selectors/settings';
import { removeAccountsFromPermissions } from '../../../core/Permissions';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import useToggleAccountGroupHidden from './hooks/useToggleAccountGroupHidden';
import type { ManageAccountsSection } from './ManageAccountsView';
import { ManageAccountRowVariant } from './components/ManageAccountRow';
import type { AccountAvatarVariant } from '../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';

/*
 * Everything the presentational `ManageAccountsView` needs, sourced from
 * Redux:
 * - `sections` mapped from the UNFILTERED `selectAccountGroupsByWallet`
 *   (the management screen shows hidden groups, with their eye state), each
 *   enriched with the per-wallet affordances: `walletId`, the account-type →
 *   row-variant mapping (`rowVariantByGroupId`), the entropy lock state
 *   (`isLocked`) and the add-account footer flag (`showsAddAccountFooter`).
 * - `isHiddenByGroupId` derived from `selectHiddenAccountGroupIds`.
 * - `onToggleHidden` forwarded to `useToggleAccountGroupHidden`, which applies the
 *   inverse of the fresh store state (the authoritative source) directly via
 *   the AccountTreeController.
 * - `onRemoveAccount` — hardware groups get the confirm Alert +
 *   `KeyringController.removeAccount` flow (same copy/approach as
 *   `AccountActions`); imported groups are handed to the injected
 *   `navigateToDeleteAccount` dependency (connector owns navigation).
 * - `onAddAccount` / `avatarAccountType` — see below.
 */

/**
 * Dependencies injected by the connector. Navigation stays out of this hook
 * so the Engine-backed handlers remain unit-testable.
 */
interface UseManageAccountsViewDeps {
  /**
   * Opens the delete-account confirmation sheet for an imported account
   * (`Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT`). Injected by
   * the connector, which owns `useNavigation`.
   */
  navigateToDeleteAccount?: (account: InternalAccount) => void;
}

/**
 * Keyring wallet categories that aggregate hardware-device accounts
 * (`AccountWalletType.Keyring` wallets whose keyring is device-backed).
 * Mirrors the hardware branch of the AccountActions remove flow
 * (`isHardwareAccount` defaults: qr / ledger / oneKey, plus trezor /
 * lattice which resolve the same way).
 */
const HARDWARE_KEYRING_TYPES: readonly KeyringTypes[] = [
  KeyringTypes.qr,
  KeyringTypes.trezor,
  KeyringTypes.oneKey,
  KeyringTypes.ledger,
  KeyringTypes.lattice,
];

const isHardwareKeyringWallet = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Keyring &&
  HARDWARE_KEYRING_TYPES.includes(wallet.metadata.keyring.type);

/**
 * Account-type → trailing-action variant (spec §5 matrix):
 * - entropy/HD groups → hide toggle only.
 * - hardware groups → hide toggle + remove control.
 * - imported groups → remove control only (not hideable).
 * - snap groups and unknown wallet/keyring subtypes → no trailing action,
 * since unknowns never get a metadata-writing affordance by default.
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
      if (wallet.metadata.keyring.type === KeyringTypes.hd) {
        return ManageAccountRowVariant.Hide;
      }
      if (wallet.metadata.keyring.type === KeyringTypes.simple) {
        return ManageAccountRowVariant.Remove;
      }
      if (HARDWARE_KEYRING_TYPES.includes(wallet.metadata.keyring.type)) {
        return ManageAccountRowVariant.HideAndRemove;
      }
      return ManageAccountRowVariant.None;
    default:
      return ManageAccountRowVariant.None;
  }
};

/**
 * Whether the wallet's entropy is locked (renders the `Locked` header state,
 * spec §4). There is no per-wallet runtime lock state in the controller
 * state (`AccountWalletObject.status` tracks discovery/alignment progress,
 * not locking), so this is derived: entropy (SRP) wallets are always
 * reported locked — their seed phrase sits behind the password — matching
 * the Figma "Entropy (SRP), locked → Locked label" spec row. Hardware,
 * imported and snap sections report unlocked.
 */
const isWalletLocked = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Entropy;

/**
 * Per spec §6 the "Add account" footer belongs to entropy and hardware
 * sections only — imported-accounts-only sections keep it out. Snap
 * sections have no add-account flow either. (The reused `AccountListFooter`
 * additionally no-ops for non-entropy wallets at render time.)
 */
const showsWalletAddAccountFooter = (wallet: AccountWalletObject): boolean =>
  wallet.type === AccountWalletType.Entropy || isHardwareKeyringWallet(wallet);

interface UseManageAccountsViewResult {
  sections: ManageAccountsSection[];
  isHiddenByGroupId: Partial<Record<AccountGroupId, boolean>>;
  onToggleHidden: (groupId: AccountGroupId, nextHidden: boolean) => void;
  onRemoveAccount: (groupId: AccountGroupId) => void;
  onAddAccount: (walletName: string) => void;
  avatarAccountType: AccountAvatarVariant;
}

const useManageAccountsView = (
  deps: UseManageAccountsViewDeps = {},
): UseManageAccountsViewResult => {
  const { navigateToDeleteAccount } = deps;
  const accountSections = useSelector(selectAccountGroupsByWallet);
  const hiddenGroupIds = useSelector(selectHiddenAccountGroupIds);
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
   * The row passes `nextHidden` as its intent, but the applied value is
   * derived from the fresh store state inside `toggleHidden` (never stale
   * props) — both always agree on a render cycle.
   */
  const onToggleHidden = useCallback(
    (groupId: AccountGroupId) => {
      toggleHidden(groupId);
    },
    [toggleHidden],
  );

  /**
   * Row-level remove, routed by the group's wallet type (same matrix as the
   * variant mapping — only variants carrying the remove affordance reach
   * here):
   * - hardware → confirm Alert, then permissions cleanup +
   * `KeyringController.removeAccount` (AccountActions pattern).
   * - imported → the connector-injected delete-account sheet navigation
   * (`Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.DELETE_ACCOUNT`), which owns
   * the confirmation UI and the actual removal.
   */
  const onRemoveAccount = useCallback(
    (groupId: AccountGroupId) => {
      const section = accountSections.find(({ data }) =>
        data.some((group) => group.id === groupId),
      );
      const group = section?.data.find(({ id }) => id === groupId);
      if (!section || !group) {
        return;
      }

      if (!isHardwareKeyringWallet(section.wallet)) {
        // Imported (remove-only) group → delete-account confirmation sheet.
        const accountId = group.accounts[0];
        const account = accountId ? internalAccountsById[accountId] : undefined;
        if (account) {
          navigateToDeleteAccount?.(account);
        }
        return;
      }

      // Hardware group → confirm Alert, then remove from the keyring.
      const accountId = group.accounts[0];
      const account = accountId ? internalAccountsById[accountId] : undefined;
      if (!account) {
        return;
      }
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
              const hexAddress = toHex(account.address);
              await removeAccountsFromPermissions([hexAddress]);
              await Engine.context.KeyringController.removeAccount(hexAddress);
            },
          },
        ],
      );
    },
    [accountSections, internalAccountsById, navigateToDeleteAccount],
  );

  /**
   * Creation itself is owned by the reused `AccountListFooter` (it calls
   * `MultichainAccountService.createNextMultichainAccountGroup` and the new
   * group flows in through the AccountTreeController store subscription), so
   * no extra action is needed here — the callback only needs to exist for
   * the footers to render.
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
