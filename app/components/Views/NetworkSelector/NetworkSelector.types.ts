import type { Hex } from '@metamask/utils';
import type { NetworkSelectorSource } from '../../../constants/networkSelector';

/**
 * Network navigation parameters
 */

/** Network selector parameters */
export interface NetworkSelectorParams {
  onNetworkSelected?: (chainId: string) => void;
  chainId?: Hex;
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
  source?: NetworkSelectorSource;
}

/** Add network parameters */
export interface AddNetworkParams {
  shouldNetworkSwitchPopToWallet?: boolean;
  shouldShowPopularNetworks?: boolean;
  network?: string;
}

/** Edit network parameters */
export interface EditNetworkParams {
  network?: string;
  shouldNetworkSwitchPopToWallet?: boolean;
  shouldShowPopularNetworks?: boolean;
}
