import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex, hexToBigInt, toCaipAssetType } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';

export interface FiatDepositAsset {
  address: Hex;
  chainId: Hex;
}

/** Matches TPC `FIAT_ASSET_ID_BY_TX_TYPE` defaults used by `getQuotes`. */
export const DEFAULT_FIAT_ASSET_BY_TX_TYPE: Partial<
  Record<TransactionType, FiatDepositAsset>
> = {
  [TransactionType.moneyAccountDeposit]: {
    address: NATIVE_TOKEN_ADDRESS as Hex,
    chainId: '0x1',
  },
  [TransactionType.perpsDeposit]: {
    address: NATIVE_TOKEN_ADDRESS as Hex,
    chainId: '0xa4b1',
  },
  [TransactionType.predictDeposit]: {
    address: '0x0000000000000000000000000000000000001010',
    chainId: '0x89',
  },
};

const ETH_MAINNET_FALLBACK: FiatDepositAsset = {
  address: NATIVE_TOKEN_ADDRESS as Hex,
  chainId: '0x1',
};

const POLYGON_NATIVE_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000001010' as Hex;

const SLIP44_COIN_TYPE_BY_CHAIN: Partial<Record<Hex, number>> = {
  '0x89': 966,
};

/**
 * Resolves the effective transaction type for fiat deposit asset lookup.
 * For batch txs, prefers the first nested type in `enabledTypes`.
 */
export function resolveFiatDepositTransactionType(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
): TransactionType | undefined {
  if (!transaction?.type) {
    return undefined;
  }

  if (transaction.type !== TransactionType.batch) {
    return transaction.type;
  }

  const nestedType = transaction.nestedTransactions?.find(
    (tx) => tx.type && enabledTypes.includes(tx.type),
  )?.type;

  return nestedType ?? transaction.type;
}

/**
 * Resolves the fiat deposit asset the same way TPC does for quotes:
 * feature-flag `assetPerTransactionType` override, then hardcoded defaults,
 * then ETH mainnet fallback.
 */
export function deriveFiatDepositAsset(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
  assetPerTransactionType?: Partial<Record<TransactionType, FiatDepositAsset>>,
): FiatDepositAsset {
  const txType = resolveFiatDepositTransactionType(transaction, enabledTypes);

  if (!txType) {
    return ETH_MAINNET_FALLBACK;
  }

  return (
    assetPerTransactionType?.[txType] ??
    DEFAULT_FIAT_ASSET_BY_TX_TYPE[txType] ??
    ETH_MAINNET_FALLBACK
  );
}

function getNativeTokenAddress(chainId: Hex): Hex {
  if (chainId.toLowerCase() === '0x89') {
    return POLYGON_NATIVE_TOKEN_ADDRESS;
  }
  return NATIVE_TOKEN_ADDRESS;
}

/**
 * Builds a CAIP-19 asset id matching TPC `buildCaipAssetType` for EVM natives
 * and ERC-20s (used as `assetId` for `getPaymentMethodsForContext` / `getQuotes`).
 */
export function buildFiatDepositCaipAssetId(asset: FiatDepositAsset): string {
  const chainReference = String(hexToBigInt(asset.chainId));
  const isNative =
    asset.address.toLowerCase() ===
    getNativeTokenAddress(asset.chainId).toLowerCase();

  if (isNative) {
    const coinType = SLIP44_COIN_TYPE_BY_CHAIN[asset.chainId] ?? 60;
    return toCaipAssetType(
      'eip155',
      chainReference,
      'slip44',
      String(coinType),
    );
  }

  return toCaipAssetType('eip155', chainReference, 'erc20', asset.address);
}

/**
 * Full deposit-asset CAIP resolution for MM Pay payment-method / quote parity.
 */
export function deriveFiatDepositAssetId(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
  assetPerTransactionType?: Partial<Record<TransactionType, FiatDepositAsset>>,
): string {
  return buildFiatDepositCaipAssetId(
    deriveFiatDepositAsset(transaction, enabledTypes, assetPerTransactionType),
  );
}
