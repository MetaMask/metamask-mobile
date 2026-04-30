/**
 * Enum to track states of the account selector screen.
 */
export enum AccountSelectorScreens {
  AccountSelector = 'AccountSelector',
  AddAccountActions = 'AddAccountActions',
  MultichainAddWalletActions = 'MultichainAddWalletActions',
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
   * Optional boolean to indicate if privacy mode is disabled.
   */
  disablePrivacyMode?: boolean;
  /**
   * Optional navigation screen to indicate if should navigate to add account actions sheet.
   */
  navigateToAddAccountActions?:
    | AccountSelectorScreens.AddAccountActions
    | AccountSelectorScreens.MultichainAddWalletActions;
  /**
   * Only show EVM accounts.
   */
  isEvmOnly?: boolean;
  /**
   * Optional boolean to hide the add account button.
   */
  disableAddAccountButton?: boolean;
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
