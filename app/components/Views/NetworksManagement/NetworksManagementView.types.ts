import { ImageSourcePropType } from 'react-native';

/**
 * Represents a network item in the management list.
 */
export interface NetworkManagementItem {
  /** Hex chain ID (e.g. '0x1') */
  chainId: string;
  /** Display name */
  name: string;
  /** Whether this is a testnet */
  isTestNet: boolean;
  /** Network avatar image source */
  imageSource: ImageSourcePropType;
  /** Active RPC endpoint URL */
  rpcUrl?: string;
  /** Whether this network has more than one RPC endpoint */
  hasMultipleRpcs: boolean;
  /** Whether this is a popular (curated) network */
  isPopular: boolean;
  /** Whether this network is already added to the user's configuration */
  isAdded: boolean;
}

/**
 * A section in the SectionList.
 */
export interface NetworkManagementSection {
  key: string;
  data: NetworkManagementItem[];
}
