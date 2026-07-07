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
       * Whether the chain has an Infura endpoint the user can switch to.
       * False when the failing endpoint is already Infura or when no Infura
       * alternative exists.
       */
      canSwitchToInfura: boolean;
    };
