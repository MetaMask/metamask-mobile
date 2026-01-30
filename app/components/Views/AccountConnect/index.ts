import Routes from '../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../util/navigation/navUtils';

export { default } from './AccountConnect';
export const createAccountConnectNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.ACCOUNT_CONNECT,
);
export type {
  AccountConnectProps,
  NetworkAvatarProps,
} from './AccountConnect.types';
