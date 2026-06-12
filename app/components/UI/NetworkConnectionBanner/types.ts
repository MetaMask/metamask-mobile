import type { Hex } from '@metamask/utils';

/**
 * Network Connection Banner Status
 *
 * Degraded: The network is taking more than 5 seconds to initialize.
 * Unavailable: The network is not available.
 */
export type NetworkConnectionBannerStatus = 'degraded' | 'unavailable';

/**
 * Shape consumed by the banner UI. Derived from
 * `NetworkConnectionBannerController` state via the selector — the
 * `visible: false` case maps to the controller's `'available'` status.
 */
export type NetworkConnectionBannerState =
  | {
      visible: false;
    }
  | {
      visible: true;
      chainId: Hex;
      status: NetworkConnectionBannerStatus;
      networkName: string;
      rpcUrl: string;
      isInfuraEndpoint: boolean;
      /**
       * Network client ID of an available Infura endpoint (for custom networks
       * that have one) that can be used to switch to Infura. Undefined if no
       * Infura endpoint is available.
       */
      infuraNetworkClientId?: string;
    };
