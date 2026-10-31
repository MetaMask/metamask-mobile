import { AccountWalletType } from '@metamask/account-api';
import type { AccountWalletObject } from '@metamask/account-tree-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import type { AccountListStats } from '../../../../selectors/multichainAccounts/manageAccounts';
import type { ManageAccountsViewedSource } from './constants';

/**
 * Build the `Manage Accounts Viewed` properties from the entry point and the
 * account tree totals. All four are required by the Segment schema, so none of
 * them may be left off — including when a count is zero.
 *
 * @param source - Entry point that opened the management view.
 * @param stats - Account, wallet and hidden totals for the whole tree.
 * @returns The event properties in their schema-defined snake_case shape.
 */
export const buildManageAccountsViewedProperties = (
  source: ManageAccountsViewedSource,
  stats: AccountListStats,
) => ({
  source,
  total_accounts: stats.totalAccounts,
  total_wallets: stats.totalWallets,
  hidden_count: stats.hiddenCount,
});

/**
 * Hardware device names the Segment schema declares for
 * `account_hardware_type` (`metamask-account-types.yaml`).
 */
type AccountHardwareType = 'Ledger' | 'Trezor' | 'QR Hardware' | 'Lattice';

/**
 * Keyring types that map to a Segment hardware device name. OneKey connects
 * over QR codes, so it reports as `QR Hardware` — the same grouping the
 * `number_of_qr_hardware_accounts` user trait uses.
 */
const KEYRING_TYPE_TO_HARDWARE_TYPE: Partial<
  Record<KeyringTypes, AccountHardwareType>
> = {
  [KeyringTypes.ledger]: 'Ledger',
  [KeyringTypes.trezor]: 'Trezor',
  [KeyringTypes.lattice]: 'Lattice',
  [KeyringTypes.qr]: 'QR Hardware',
  [KeyringTypes.oneKey]: 'QR Hardware',
};

/**
 * Account provenance properties shared by the `Account Hidden` and
 * `Account Removed` events, in their schema-defined snake_case shape.
 *
 * `account_type` is required by the schema, so it always resolves to one of
 * its declared values. The optional keys are left off when they do not apply.
 */
export interface AccountWalletMetricProps {
  account_type: 'metamask' | 'imported' | 'snap' | AccountHardwareType;
  account_hardware_type?: AccountHardwareType;
  account_snap_type?: string;
}

/**
 * Build the account provenance properties for a wallet from the account tree.
 *
 * `AccountWalletType` values (`entropy`/`keyring`/`snap`) are not valid
 * `account_type` values, and neither are the capitalised labels returned by
 * `getAddressAccountType`, so neither is passed through.
 *
 * `account_import_type` is deliberately not reported: an imported private key
 * wallet cannot tell a `private_key` import from a `json` one after the fact.
 *
 * @param wallet - Wallet from the account tree, if it can still be resolved.
 * @returns Properties to spread into an account management event.
 */
export const getAccountWalletMetricProps = (
  wallet?: AccountWalletObject | null,
): AccountWalletMetricProps => {
  if (wallet?.type === AccountWalletType.Snap) {
    return {
      account_type: 'snap',
      account_snap_type: wallet.metadata.snap.id,
    };
  }

  if (wallet?.type === AccountWalletType.Keyring) {
    const keyringType = wallet.metadata.keyring.type;

    if (keyringType === KeyringTypes.simple) {
      return { account_type: 'imported' };
    }

    const hardwareType = KEYRING_TYPE_TO_HARDWARE_TYPE[keyringType];
    if (hardwareType) {
      // The schema expects `account_type` to match `account_hardware_type`
      // for hardware wallets, so both carry the device name.
      return {
        account_type: hardwareType,
        account_hardware_type: hardwareType,
      };
    }
  }

  // Entropy wallets, and anything that can no longer be resolved, are
  // MetaMask's own accounts.
  return { account_type: 'metamask' };
};
