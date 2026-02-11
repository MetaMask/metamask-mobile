import { CaipChainId } from '@metamask/keyring-api';
import AppConstants from '../../../../core/AppConstants';
import { CaipAssetType, Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import {
  ALLOWED_BRIDGE_CHAIN_IDS,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { ImageSourcePropType } from 'react-native';
import imageIcons from '../../../../images/image-icons';

export const isBridgeAllowed = (chainId: Hex | CaipChainId | string) => {
  if (!AppConstants.BRIDGE.ACTIVE) {
    return false;
  }

  return (
    ALLOWED_BRIDGE_CHAIN_IDS as readonly (Hex | CaipChainId | string)[]
  ).includes(chainId);
};

export const wipeBridgeStatus = (
  address: string,
  chainId: Hex | CaipChainId,
) => {
  Engine.context.BridgeStatusController.wipeBridgeStatus({
    address,
    ignoreNetwork: false,
  });
  // Solana addresses are case-sensitive, so we can only do this for EVM
  if (!isNonEvmChainId(chainId)) {
    Engine.context.BridgeStatusController.wipeBridgeStatus({
      address: address.toLowerCase(),
      ignoreNetwork: false,
    });
  }
};

export const getTokenIconUrl = (
  assetId: CaipAssetType | undefined,
  isNonEvmChain: boolean,
) => {
  if (!assetId) {
    return undefined;
  }
  const formattedAddress = isNonEvmChain ? assetId : assetId.toLowerCase();
  return `https://static.cx.metamask.io/api/v2/tokenIcons/assets/${formattedAddress
    .split(':')
    .join('/')}.png`;
};

/**
 * Returns the proper image source for a token, prioritizing local icons from imageIcons
 * over remote URLs. This ensures consistent branding for tokens like TRX, ETH, SOL, etc.
 *
 * @param symbol - The token symbol (e.g., 'TRX', 'ETH', 'SOL')
 * @param imageUrl - The remote image URL (fallback if no local icon exists)
 * @returns ImageSourcePropType - Either a local require() result or { uri: string }
 */
export const getTokenImageSource = (
  symbol: string | undefined,
  imageUrl: string | undefined,
): ImageSourcePropType | undefined => {
  // Check if we have a local icon for this symbol
  if (symbol && Object.keys(imageIcons).includes(symbol)) {
    const imageIcon = imageIcons[symbol as keyof typeof imageIcons];
    // Only return if it's a valid image source (not a function/SVG component or string)
    if (typeof imageIcon !== 'function' && typeof imageIcon !== 'string') {
      return imageIcon as ImageSourcePropType;
    }
  }

  // Fall back to remote URL
  if (imageUrl) {
    return { uri: imageUrl };
  }

  return undefined;
};
