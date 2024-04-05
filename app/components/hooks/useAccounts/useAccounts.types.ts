// Third party dependencies.
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import { AvatarGroupToken } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.types';

/**
 * Asset information associated with the account, which includes both the fiat balance and owned tokens.
 */
export interface Assets {
  /**
   * Fiat balance in string format.
   */
  fiatBalance: string;
  /**
   * Tokens owned by this account.
   */
  tokens?: AvatarGroupToken[];
}

/**
 * Account information.
 */
export interface Account {
  /**
   * Account name.
   */
  name: string;
  /**
   * Account address.
   */
  address: string;
  /**
   * Asset information associated with the account, which includes both the fiat balance and owned tokens.
   */
  assets?: Assets;
  /**
   * Account type.
   */
  type: KeyringTypes;
  /**
   * Y offset of the item. Used for scrolling purposes.
   */
  yOffset: number;
  /**
   * Boolean that indicates if the account matches the active account on the wallet.
   */
  isSelected: boolean;
  /**
   * Optional error that indicates if the account has enough funds. Non-empty string will render the account item non-selectable.
   */
  balanceError?: string;
}

/**
 * Mapping of ENS names by account address.
 */
export type EnsByAccountAddress = Record<string, string>;

/**
 * Optional params that useAccount hook takes.
 */
export interface UseAccountsParams {
  /**
   * Optional callback that is used to check for a balance requirement. Non-empty string will render the account item non-selectable.
   * @param balance - The ticker balance of an account in wei and hex string format.
   */

  checkBalanceError?: (balance: string) => string;
  /**
   * Optional boolean that indicates if accounts are being processed in the background. Setting this to true will prevent any unnecessary updates while loading.
   * @default false
   */
  isLoading?: boolean;
}

/**
 * Return value for useAccounts hook.
 */
export interface UseAccounts {
  /**
   * List of account information.
   */
  accounts: Account[];
  /**
   * Mapping of ENS names by account address.
   */
  ensByAccountAddress: EnsByAccountAddress;
}
