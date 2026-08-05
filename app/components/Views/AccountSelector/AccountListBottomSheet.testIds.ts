import enContent from '../../../../locales/languages/en.json';
import { ACCOUNT_CELL_MENU_TEST_ID } from '../../../component-library/components-temp/MultichainAccounts/AccountCell/AccountCell.testIds';

export const AccountListBottomSheetSelectorsIDs = {
  ACCOUNT_LIST_ID: 'account-list',
  ACCOUNT_LIST_ADD_BUTTON_ID: 'account-list-add-account-button',
  ACCOUNT_TYPE_LABEL: 'account-type-label',
  ACCOUNT_BALANCE_BY_ADDRESS_TEST_ID: 'account-balance-by-address',
  CREATE_ACCOUNT: 'create-account',
  ACCOUNT_CELL_MENU_TEST_ID,
};

export const AccountListBottomSheetSelectorsText = {
  ACCOUNTS_LIST_TITLE: enContent.accounts.accounts_title,
  REMOVE_IMPORTED_ACCOUNT: enContent.accounts.yes_remove_it,
  ACCOUNT_TYPE_LABEL_TEXT: 'Imported accounts',
  ADD_ETHEREUM_ACCOUNT: enContent.account_actions.add_new_account,
};
