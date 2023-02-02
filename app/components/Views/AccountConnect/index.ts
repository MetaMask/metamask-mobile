import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';
import { AccountConnectParams } from './AccountConnect.types';

export { default } from './AccountConnect';
export const createAccountConnectNavDetails =
  createNavigationDetails<AccountConnectParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ACCOUNT_CONNECT,
  );
export type { AccountConnectProps } from './AccountConnect.types';
