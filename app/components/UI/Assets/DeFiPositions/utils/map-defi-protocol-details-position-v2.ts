import {
  getNativeTokenAddress,
  type DeFiPositionType,
  type DeFiUnderlyingPosition,
} from '@metamask/assets-controllers';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { isCaipChainId, parseCaipAssetType, type Hex } from '@metamask/utils';

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
  /** Position type from protocol metadata (e.g. deposit, staked). */
  positionType: DeFiPositionType;
}

function toTokenCellChainId(
  chainId: DeFiUnderlyingPosition['chainId'],
): string {
  if (isCaipChainId(chainId) && !isNonEvmChainId(chainId)) {
    return formatChainIdToHex(chainId) as Hex;
  }

  return chainId;
}

/**
 * Resolves the token-cell `address` for a DeFi underlying position.
 *
 * - Non-EVM: return the CAIP asset id unchanged.
 * - EVM slip44 (native): return the chain's native token address (or zero).
 * - EVM erc20: return the checksummed contract address.
 *
 * @param position - Underlying position from `DeFiPositionsControllerV2` state.
 * @returns Token cell address appropriate for the chain/asset type.
 */
function toTokenCellAddress(position: DeFiUnderlyingPosition): string {
  if (isNonEvmChainId(position.chainId)) {
    return position.assetId;
  }

  const { assetReference, assetNamespace } = parseCaipAssetType(
    position.assetId,
  );
  const hexChainId = toTokenCellChainId(position.chainId) as Hex;

  if (assetNamespace === 'slip44') {
    return getNativeTokenAddress(hexChainId);
  }

  if (assetNamespace === 'erc20') {
    return toChecksumHexAddress(assetReference);
  }

  return position.assetId;
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
    key: `${position.groupId}-${position.poolAddress}-${position.assetId}-${position.positionType}`,
    address: toTokenCellAddress(position),
    name: position.name,
    symbol: position.symbol,
    iconUrl: position.tokenImage ?? '',
    balance: normalizedBalance,
    marketValue: position.marketValue,
    chainId: toTokenCellChainId(position.chainId),
    isNative,
    positionType: position.positionType,
  };
}
