import type { WalletOptions } from '@metamask/wallet';
import { NetInfoConnectivityAdapter } from '../../controllers/connectivity';

type ConnectivityControllerInstanceOptions =
  WalletOptions['instanceOptions']['connectivityController'];

export function getConnectivityControllerInstanceOptions(): ConnectivityControllerInstanceOptions {
  return {
    connectivityAdapter: new NetInfoConnectivityAdapter(),
  };
}
