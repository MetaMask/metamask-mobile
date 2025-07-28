// Third party dependencies.
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import { AvatarTokenProps } from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken/AvatarToken.types';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { AccountId } from '@metamask/accounts-controller';

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
  tokens?: AvatarTokenProps[];
}

/**
 * Account information.
 */
export interface Account {
  /**
   * Account ID.
   */
  id: AccountId;
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
  /**
   * Account address in CAIP-10 format.
   */
  caipAccountId: CaipAccountId;
  /**
   * Boolean that indicates if the account is loading.
   */
  isLoadingAccount: boolean;
  /**
   * Account scopes.
   */
  scopes: CaipChainId[];

  /**
   * Optional snap ID that the account belongs to.
   */
  snapId?: string;
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
   * List of EVM account information.
   */
  evmAccounts: Account[];
  /**
   * Mapping of ENS names by account address.
   */
  ensByAccountAddress: EnsByAccountAddress;
}
