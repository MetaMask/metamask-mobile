import type { WalletOptions } from '@metamask/wallet';
import { NetInfoConnectivityAdapter } from '../../controllers/connectivity';

type ConnectivityControllerInstanceOptions =
  WalletOptions['instanceOptions']['connectivityController'];

/**
 * Mobile supplies a `NetInfoConnectivityAdapter` (backed by
 * `@react-native-community/netinfo`) so the wallet-owned ConnectivityController
 * can observe device network connectivity.
 *
 * @returns The mobile ConnectivityController instance options.
 */
export function getConnectivityControllerInstanceOptions(): ConnectivityControllerInstanceOptions {
  return {
    connectivityAdapter: new NetInfoConnectivityAdapter(),
  };
}
