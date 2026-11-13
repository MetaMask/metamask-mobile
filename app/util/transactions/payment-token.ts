import { getNativeTokenAddress } from '@metamask/assets-controllers';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import {
  KnownCaipNamespace,
  numberToHex,
  parseCaipAssetType,
  toCaipAssetType,
  toCaipChainId,
  type CaipAssetType,
  type Hex,
} from '@metamask/utils';

/** SLIP-44 coin type of a native token, by chain, where it is not 60 (ETH). */
const SLIP44_COIN_TYPE_BY_CHAIN: Partial<Record<Hex, number>> = {
  [CHAIN_IDS.POLYGON]: 966,
};

const DEFAULT_SLIP44_COIN_TYPE = 60;

/** Payment token on an EVM chain, with the chain and address derived from its asset ID. */
export type EvmPaymentToken = TransactionPaymentToken & {
  address: Hex;
  chainId: Hex;
};

/**
 * Derive the Hex chain ID and token address of an EVM CAIP-19 asset type. A
 * `slip44` native asset maps to the chain's native token address, matching the
 * address the confirmation asset list exposes for natives.
 *
 * @param assetId - CAIP-19 asset type.
 * @returns The Hex chain ID and token address, or undefined for a non-EVM asset.
 */
export function getEvmAsset(
  assetId: CaipAssetType,
): { address: Hex; chainId: Hex } | undefined {
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
 * Add the chain ID and address derived from its asset ID to an EVM payment
 * token.
 *
 * @param paymentToken - Payment token, if any.
 * @returns The EVM payment token, or undefined if none is selected or it is not
 * an EVM token.
 */
export function getEvmPaymentToken(
  paymentToken: TransactionPaymentToken | undefined,
): EvmPaymentToken | undefined {
  const evmAsset = paymentToken && getEvmAsset(paymentToken.assetId);

  return evmAsset && { ...paymentToken, ...evmAsset };
}

/**
 * Get the CAIP-19 asset ID of an EVM token as keyed in `AssetsController`
 * state, which identifies the payment token in `updatePaymentToken`.
 *
 * A native token is the chain's asset of type `native`, since natives are
 * keyed as `slip44` assets. An ERC-20 key is matched case-insensitively,
 * preferring a checksummed key over a lowercase duplicate. A token absent from
 * state falls back to its derived asset ID.
 *
 * @param token - EVM token.
 * @param token.address - Token address, or the chain's native token address.
 * @param token.chainId - Hex chain ID.
 * @param assetsInfo - `AssetsController` asset metadata keyed by asset ID.
 * @returns The CAIP-19 asset ID of the token.
 */
export function getEvmPaymentTokenAssetId(
  { address, chainId }: { address: Hex; chainId: Hex },
  assetsInfo: AssetsControllerState['assetsInfo'],
): CaipAssetType {
  const caipChainId = toCaipChainId(
    KnownCaipNamespace.Eip155,
    String(parseInt(chainId, 16)),
  );
  const chainPrefix = `${caipChainId}/`;
  const keys = Object.keys(assetsInfo) as CaipAssetType[];
  const derivedAssetId: CaipAssetType = `${caipChainId}/erc20:${address}`;
  const isNative =
    address.toLowerCase() === getNativeTokenAddress(chainId).toLowerCase();

  if (isNative) {
    return (
      keys.find(
        (key) =>
          key.startsWith(chainPrefix) && assetsInfo[key].type === 'native',
      ) ??
      toCaipAssetType(
        KnownCaipNamespace.Eip155,
        String(parseInt(chainId, 16)),
        'slip44',
        String(SLIP44_COIN_TYPE_BY_CHAIN[chainId] ?? DEFAULT_SLIP44_COIN_TYPE),
      )
    );
  }

  const target = derivedAssetId.toLowerCase();
  const matches = keys.filter((key) => key.toLowerCase() === target);

  return (
    matches.find((key) => key !== key.toLowerCase()) ??
    matches[0] ??
    derivedAssetId
  );
}
