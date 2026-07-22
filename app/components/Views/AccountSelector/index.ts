import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { AccountSelectorParams } from './AccountSelector.types';

export const createAccountSelectorNavDetails =
  createNavigationDetails<AccountSelectorParams>(
    Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR,
  );
export { default } from './AccountSelector';
