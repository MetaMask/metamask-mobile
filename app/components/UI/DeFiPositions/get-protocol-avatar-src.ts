import type { ImageOrSvgSrc } from '@metamask/design-system-react-native';
import metamaskFoxLogo from '../../../images/branding/fox.png';

/**
 * DeFi adapters protocol id for MetaMask staking (pooled and validator staking).
 */
export const METAMASK_DEFI_PROTOCOL_ID = 'metamask';

/**
 * Returns the avatar image source for a DeFi protocol.
 *
 * The DeFi adapters API returns an outdated MetaMask fox icon for the MetaMask
 * staking protocol, so MetaMask uses the bundled current logo instead. Every
 * other protocol keeps the icon URL returned by the API.
 *
 * @param protocolIconUrl - Icon URL returned by the DeFi positions API.
 * @param protocolId - DeFi positions API protocol id.
 * @returns The image source to render.
 */
export function getProtocolAvatarSrc(
  protocolIconUrl: string,
  protocolId?: string,
): ImageOrSvgSrc {
  if (protocolId === METAMASK_DEFI_PROTOCOL_ID) {
    // Bundled PNGs resolve to a numeric asset id at runtime.
    return metamaskFoxLogo as ImageOrSvgSrc;
  }
  return { uri: protocolIconUrl };
}
