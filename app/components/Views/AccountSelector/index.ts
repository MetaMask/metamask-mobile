import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { AccountSelectorParams } from './AccountSelector.types';

export const createAccountSelectorNavDetails =
  createNavigationDetails<AccountSelectorParams>(Routes.SHEET.ACCOUNT_SELECTOR);
export { default } from './AccountSelector';
