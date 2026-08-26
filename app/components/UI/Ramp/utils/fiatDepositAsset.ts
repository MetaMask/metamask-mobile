import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex, hexToBigInt, toCaipAssetType } from '@metamask/utils';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';

export interface FiatDepositAsset {
  address: Hex;
  chainId: Hex;
}

const POLYGON_POL: Hex = '0x0000000000000000000000000000000000001010';
const ETH_MAINNET: FiatDepositAsset = {
  address: NATIVE_ADDRESS as Hex,
  chainId: '0x1',
};

/**
 * Mirrors `FIAT_ASSET_ID_BY_TX_TYPE` in
 * `@metamask/transaction-pay-controller`, which owns this mapping but does not
 * export it. See the TODO on {@link deriveFiatDepositAssetId}.
 */
const DEFAULT_ASSET_BY_TX_TYPE: Partial<
  Record<TransactionType, FiatDepositAsset>
> = {
  [TransactionType.moneyAccountDeposit]: ETH_MAINNET,
  [TransactionType.perpsDeposit]: {
    address: NATIVE_ADDRESS as Hex,
    chainId: '0xa4b1',
  },
  [TransactionType.predictDeposit]: { address: POLYGON_POL, chainId: '0x89' },
};

/** Chains whose native token is not `NATIVE_ADDRESS` at SLIP-44 60. */
const NATIVE_OVERRIDES: Partial<Record<Hex, { address: Hex; slip44: number }>> =
  { '0x89': { address: POLYGON_POL, slip44: 966 } };

function toAssetId({ address, chainId }: FiatDepositAsset): string {
  const chainReference = String(hexToBigInt(chainId));
  const native = NATIVE_OVERRIDES[chainId.toLowerCase() as Hex];
  const isNative =
    address.toLowerCase() === (native?.address ?? NATIVE_ADDRESS).toLowerCase();

  return isNative
    ? toCaipAssetType(
        'eip155',
        chainReference,
        'slip44',
        String(native?.slip44 ?? 60),
      )
    : toCaipAssetType('eip155', chainReference, 'erc20', address);
}

/**
 * CAIP-19 id of the asset an MM Pay deposit settles in, resolved the same way
 * `@metamask/transaction-pay-controller` resolves it for `getQuotes`: the
 * `assetPerTransactionType` flag override, then that package's defaults, then
 * ETH mainnet. Batch transactions use their first enabled nested type.
 *
 * Returns `''` when the transaction is not a fiat deposit, which leaves the
 * payment-methods query idle rather than fetching a catalog nobody asked for.
 *
 * TODO: `@metamask/transaction-pay-controller` owns this mapping as
 * `FIAT_ASSET_ID_BY_TX_TYPE`, and the CAIP construction as
 * `buildCaipAssetType`, but its entry point exports neither, so this file
 * mirrors both. Getting them exported and consumed here needs two steps: a core
 * PR adding the re-exports, and a mobile bump off 26.4.1 (27.0.0 replaced
 * `resolveSourceAmount` with `getBalance`, which mobile has not adopted).
 */
export function deriveFiatDepositAssetId(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
  assetPerTransactionType?: Partial<Record<TransactionType, FiatDepositAsset>>,
): string {
  const candidate =
    transaction?.type === TransactionType.batch
      ? transaction.nestedTransactions?.find(
          (tx) => tx.type && enabledTypes.includes(tx.type),
        )?.type
      : transaction?.type;
  const txType =
    candidate && enabledTypes.includes(candidate) ? candidate : undefined;

  if (!txType) {
    return '';
  }

  return toAssetId(
    assetPerTransactionType?.[txType] ??
      DEFAULT_ASSET_BY_TX_TYPE[txType] ??
      ETH_MAINNET,
  );
}
