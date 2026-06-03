import Routes from '../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import { AccountConnectParams } from './AccountConnect.types';

export const createMultichainAccountConnectNavDetails =
  createNavigationDetails<AccountConnectParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ACCOUNT_CONNECT,
  );
export type { NetworkAvatarProps } from './AccountConnect.types';
