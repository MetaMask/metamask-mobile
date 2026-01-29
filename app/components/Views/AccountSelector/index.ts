import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';

export const createAccountSelectorNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.ACCOUNT_SELECTOR,
);
export { default } from './AccountSelector';
