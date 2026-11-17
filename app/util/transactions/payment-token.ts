import { getNativeTokenAddress } from '@metamask/assets-controllers';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import {
  KnownCaipNamespace,
  numberToHex,
  parseCaipAssetType,
  toCaipAssetType,
  toCaipChainId,
  type CaipAssetType,
  type CaipChainId,
  type Hex,
} from '@metamask/utils';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** EVM token identified by its Hex chain ID and token address. */
export interface EvmTokenReference {
  address: Hex;
  chainId: Hex;
}

/**
 * Encodes the CAIP-19 asset ID of an EVM token as keyed in `AssetsController`
 * state.
 */
export type EvmAssetIdEncoder = (token: EvmTokenReference) => CaipAssetType;

/** `AssetsController` asset IDs indexed for {@link encodeEvmAssetId}. */
export interface AssetIdIndex {
  /** Asset ID by lowercase asset ID, preferring a checksummed key. */
  byLowercaseAssetId: Map<string, CaipAssetType>;
  /** Asset ID of the `native` asset by CAIP-2 chain ID. */
  nativeByChain: Map<CaipChainId, CaipAssetType>;
}

/**
 * Derive the Hex chain ID and token address of an EVM CAIP-19 asset type. A
 * `slip44` native asset maps to the chain's native token address, matching the
 * address the confirmation asset list exposes for natives.
 *
 * @param assetId - CAIP-19 asset type.
 * @returns The Hex chain ID and token address, or undefined for a non-EVM asset.
 */
export function decodeEvmAssetId(
  assetId: CaipAssetType,
): EvmTokenReference | undefined {
  const { chain, assetNamespace, assetReference } = parseCaipAssetType(assetId);

  if (chain.namespace !== KnownCaipNamespace.Eip155) {
    return undefined;
  }

  const chainId = numberToHex(Number(chain.reference));

  const address =
    assetNamespace === 'slip44'
      ? getNativeTokenAddress(chainId)
      : (assetReference as Hex);

  return { address, chainId };
}

/**
 * Derive the Hex chain ID and token address of a payment token, for the EVM
 * lookups (market data, gas, routes) that are keyed by them.
 *
 * @param paymentToken - Payment token, if any.
 * @returns The Hex chain ID and token address, or undefined if no token is
 * selected or it is not an EVM token.
 */
export function decodePaymentTokenAssetId(
  paymentToken: Pick<TransactionPaymentToken, 'assetId'> | undefined,
): EvmTokenReference | undefined {
  return paymentToken && decodeEvmAssetId(paymentToken.assetId);
}

/**
 * Whether two CAIP-19 asset IDs identify the same asset. EVM addresses are
 * case-insensitive, so `AssetsController` keys and derived IDs may differ in
 * case only.
 *
 * @param assetId - CAIP-19 asset ID, if any.
 * @param otherAssetId - CAIP-19 asset ID to compare with, if any.
 * @returns Whether both are defined and identify the same asset.
 */
export function isSameAssetId(
  assetId: string | undefined,
  otherAssetId: string | undefined,
): boolean {
  return Boolean(
    assetId &&
      otherAssetId &&
      assetId.toLowerCase() === otherAssetId.toLowerCase(),
  );
}

/**
 * Index `AssetsController` asset IDs so EVM tokens resolve to their key in
 * constant time, even when matched case-insensitively.
 *
 * @param assetsInfo - `AssetsController` asset metadata keyed by asset ID.
 * @returns The asset ID index.
 */
export function buildAssetIdIndex(
  assetsInfo: AssetsControllerState['assetsInfo'],
): AssetIdIndex {
  const byLowercaseAssetId = new Map<string, CaipAssetType>();
  const nativeByChain = new Map<CaipChainId, CaipAssetType>();

  for (const assetId of Object.keys(assetsInfo) as CaipAssetType[]) {
    const lowercaseAssetId = assetId.toLowerCase();
    const indexed = byLowercaseAssetId.get(lowercaseAssetId);

    if (!indexed || indexed === lowercaseAssetId) {
      byLowercaseAssetId.set(lowercaseAssetId, assetId);
    }

    if (assetsInfo[assetId].type === 'native') {
      const { chainId } = parseCaipAssetType(assetId);

      if (!nativeByChain.has(chainId)) {
        nativeByChain.set(chainId, assetId);
      }
    }
  }

  return { byLowercaseAssetId, nativeByChain };
}

/**
 * Resolve the CAIP-19 asset ID of an EVM token as keyed in `AssetsController`
 * state, which identifies the payment token in `updatePaymentToken`.
 *
 * A native token is the chain's asset of type `native`, since natives are
 * keyed as `slip44` assets. When state has no native asset for the chain, it
 * falls back to the native asset registry, then to the zero-address ERC-20
 * asset ID `AssetsController` uses for unregistered EVM chains. An ERC-20 key
 * is matched case-insensitively, preferring a checksummed key over a lowercase
 * duplicate. A token absent from
 * state falls back to its derived asset ID with a checksummed address, which
 * is how `AssetsController` keys it once added (e.g. by `addCustomAsset`).
 *
 * @param token - EVM token.
 * @param token.address - Token address, or the chain's native token address.
 * @param token.chainId - Hex chain ID.
 * @param index - `AssetsController` asset IDs, from {@link buildAssetIdIndex}.
 * @returns The CAIP-19 asset ID of the token.
 */
export function encodeEvmAssetId(
  { address, chainId }: EvmTokenReference,
  index: AssetIdIndex,
): CaipAssetType {
  const chainReference = String(parseInt(chainId, 16));
  const caipChainId = toCaipChainId(KnownCaipNamespace.Eip155, chainReference);
  const isNative =
    address.toLowerCase() === getNativeTokenAddress(chainId).toLowerCase();

  if (isNative) {
    return (
      index.nativeByChain.get(caipChainId) ??
      getRegisteredNativeAssetId(chainId) ??
      // `AssetsController` keys the native asset of an unregistered EVM chain
      // by the zero-address ERC-20 encoding.
      toCaipAssetType(
        KnownCaipNamespace.Eip155,
        chainReference,
        'erc20',
        ZERO_ADDRESS,
      )
    );
  }

  const derivedAssetId = toCaipAssetType(
    KnownCaipNamespace.Eip155,
    chainReference,
    'erc20',
    toChecksumHexAddress(address),
  );

  return (
    index.byLowercaseAssetId.get(derivedAssetId.toLowerCase()) ?? derivedAssetId
  );
}

/**
 * Get the native asset ID of an EVM chain from the native asset registry.
 *
 * @param chainId - Hex chain ID.
 * @returns The native asset ID, or undefined if the chain is not registered.
 */
function getRegisteredNativeAssetId(chainId: Hex): CaipAssetType | undefined {
  try {
    return getNativeAssetForChainId(chainId).assetId;
  } catch {
    return undefined;
  }
}
