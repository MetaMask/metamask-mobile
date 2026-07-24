import type { DeFiUnderlyingPosition } from '@metamask/assets-controllers';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { isCaipChainId, parseCaipAssetType, type Hex } from '@metamask/utils';
import AppConstants from '../../../../core/AppConstants';

/**
 * Mobile token cell shape consumed by DeFi protocol details UI.
 */
export interface DeFiDetailsPositionTokenV2 {
  key: string;
  address: string;
  name: string;
  symbol: string;
  iconUrl: string;
  balance: number;
  marketValue: number | undefined;
  chainId: string;
  isNative: boolean;
}

function toTokenCellChainId(
  chainId: DeFiUnderlyingPosition['chainId'],
): string {
  if (isCaipChainId(chainId) && !isNonEvmChainId(chainId)) {
    return formatChainIdToHex(chainId) as Hex;
  }

  return chainId;
}

function toTokenCellAddress(position: DeFiUnderlyingPosition): string {
  const { assetReference, assetNamespace } = parseCaipAssetType(
    position.assetId,
  );

  if (assetNamespace === 'slip44') {
    // Native assets use the zero address so existing avatar helpers recognize ETH.
    return AppConstants.ZERO_ADDRESS;
  }

  return toChecksumHexAddress(assetReference) ?? assetReference;
}

/**
 * Returns the human-readable balance for a DeFi underlying position.
 *
 * @param position - Underlying position from `DeFiPositionsControllerV2` state.
 * @returns Parsed balance amount, or 0 when invalid.
 */
function getNormalizedBalance(position: DeFiUnderlyingPosition): number {
  const normalizedBalance = Number.parseFloat(position.balance);

  return Number.isFinite(normalizedBalance) ? normalizedBalance : 0;
}

/**
 * Maps a DeFi underlying position (from `DeFiPositionsControllerV2` state) to
 * the mobile token cell shape used by protocol details.
 *
 * @param position - Underlying position from the details-page section.
 * @returns Token data used by the DeFi details position cell.
 */
export function mapDefiProtocolDetailsPositionV2ToToken(
  position: DeFiUnderlyingPosition,
): DeFiDetailsPositionTokenV2 {
  const { assetNamespace } = parseCaipAssetType(position.assetId);
  const isNative = assetNamespace === 'slip44';
  const normalizedBalance = getNormalizedBalance(position);

  return {
    key: `${position.assetId}-${position.poolAddress}-${position.groupId}`,
    address: toTokenCellAddress(position),
    name: position.name,
    symbol: position.symbol,
    iconUrl: position.tokenImage ?? '',
    balance: normalizedBalance,
    marketValue: position.marketValue,
    chainId: toTokenCellChainId(position.chainId),
    isNative,
  };
}
