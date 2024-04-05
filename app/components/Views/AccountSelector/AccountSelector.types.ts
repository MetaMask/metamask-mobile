// External dependencies.
import { UseAccountsParams } from '../../../components/hooks/useAccounts';

/**
 * Enum to track states of the account selector screen.
 */
export enum AccountSelectorScreens {
  AccountSelector = 'AccountSelector',
  AddAccountActions = 'AddAccountActions',
}

export interface AccountSelectorParams {
  /**
   * Optional callback that is called whenever a new account is being created.
   */
  onCreateNewAccount?: () => void;
  /**
   * Optional callback that is called whenever import account is being opened.
   */
  onOpenImportAccount?: () => void;
  /**
   * Optional callback that is called whenever connect hardware wallet is being opened.
   */
  onOpenConnectHardwareWallet?: () => void;
  /**
   * Optional callback that is called whenever an account is selected.
   */
  onSelectAccount?: (address: string) => void;
  /**
   * Optional boolean that indicates if the sheet is for selection only. Other account actions are disabled when this is true.
   */
  isSelectOnly?: boolean;
  /**
   * Optional callback that is used to check for a balance requirement. Non-empty string will render the account item non-selectable.
   * @param balance - The ticker balance of an account in wei and hex string format.
   */
  checkBalanceError?: UseAccountsParams['checkBalanceError'];
}

/**
 * AccountSelectorProps props.
 */
export interface AccountSelectorProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params?: AccountSelectorParams;
  };
}
