// Third party dependencies.
import { KeyringTypes } from '@metamask/controllers';

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
   * Boolean that indicates if the account is selected.
   */
  isSelected: boolean;
  /**
   * Optional error that indicates if the account has enough funds. Non-empty string will render the account item non-selectable.
   */
  balanceError?: string;
}

/**
 * AccountSelectorList props.
 */
export interface AccountSelectorListProps {
  /**
   * Optional callback to trigger when account is selected.
   */
  onSelectAccount?: (address: string) => void;
  /**
   * Optional callback that is used to check for a balance requirement. Non-empty string will render the account item non-selectable.
   * @param balance - The ticker balance of an account in wei and hex string format.
   */
  checkBalanceError?: (balance: string) => string;
}
