import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex, hexToBigInt, toCaipAssetType } from '@metamask/utils';
import { NATIVE_TOKEN_ADDRESS } from '../../../Views/confirmations/constants/tokens';

export interface FiatDepositAsset {
  address: Hex;
  chainId: Hex;
}

/** Matches TPC `FIAT_ASSET_ID_BY_TX_TYPE` defaults used by `getQuotes`. */
const DEFAULT_ASSET_BY_TX_TYPE: Partial<
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

const ETH_MAINNET: FiatDepositAsset = {
  address: NATIVE_TOKEN_ADDRESS as Hex,
  chainId: '0x1',
};

/** Chains whose native token is not `NATIVE_TOKEN_ADDRESS` at SLIP-44 60. */
const NATIVE_OVERRIDES: Partial<
  Record<Hex, { address: Hex; coinType: number }>
> = {
  '0x89': {
    address: '0x0000000000000000000000000000000000001010',
    coinType: 966,
  },
};

/**
 * CAIP-19 id of the asset an MM Pay deposit settles in, resolved the same way
 * `@metamask/transaction-pay-controller` resolves it for `getQuotes`:
 * `assetPerTransactionType` flag override, then the hardcoded defaults, then
 * ETH mainnet. Batch transactions use their first enabled nested type.
 *
 * NOTE: duplicates a derivation that already lives inside TPC but is not
 * exported from that package.
 */
export function deriveFiatDepositAssetId(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
  assetPerTransactionType?: Partial<Record<TransactionType, FiatDepositAsset>>,
): string {
  const txType =
    transaction?.type === TransactionType.batch
      ? (transaction.nestedTransactions?.find(
          (tx) => tx.type && enabledTypes.includes(tx.type),
        )?.type ?? TransactionType.batch)
      : transaction?.type;

  const { address, chainId } =
    (txType &&
      (assetPerTransactionType?.[txType] ??
        DEFAULT_ASSET_BY_TX_TYPE[txType])) ||
    ETH_MAINNET;

  const chainReference = String(hexToBigInt(chainId));
  const native = NATIVE_OVERRIDES[chainId.toLowerCase() as Hex];
  const isNative =
    address.toLowerCase() ===
    (native?.address ?? NATIVE_TOKEN_ADDRESS).toLowerCase();

  return isNative
    ? toCaipAssetType(
        'eip155',
        chainReference,
        'slip44',
        String(native?.coinType ?? 60),
      )
    : toCaipAssetType('eip155', chainReference, 'erc20', address);
}
