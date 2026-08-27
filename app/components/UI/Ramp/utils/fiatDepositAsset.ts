import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '@metamask/money-account-utils';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { type Hex, hexToBigInt, toCaipAssetType } from '@metamask/utils';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { POLYGON_NATIVE_TOKEN } from '../../Bridge/constants/assets';

export interface FiatDepositAsset {
  address: Hex;
  chainId: Hex;
}

const ETH_MAINNET: FiatDepositAsset = {
  address: NATIVE_ADDRESS as Hex,
  chainId: CHAIN_IDS.MAINNET,
};

/**
 * Mirrors `FIAT_ASSET_ID_BY_TX_TYPE`, unexported by TPC. See the TODO below.
 * `moneyAccountDeposit` is intentionally absent: it resolves ahead of both the
 * override and this table. The perps and predict entries stay because TPC's own
 * `FIAT_ASSET_ID_BY_TX_TYPE` still carries them, so the mirror must too.
 */
const DEFAULT_ASSET_BY_TX_TYPE: Partial<
  Record<TransactionType, FiatDepositAsset>
> = {
  [TransactionType.perpsDeposit]: {
    address: NATIVE_ADDRESS as Hex,
    chainId: CHAIN_IDS.ARBITRUM,
  },
  [TransactionType.predictDeposit]: {
    address: POLYGON_NATIVE_TOKEN,
    chainId: CHAIN_IDS.POLYGON,
  },
};

/** Chains whose native token is not `NATIVE_ADDRESS` at SLIP-44 60. */
const NATIVE_OVERRIDES: Partial<Record<Hex, { address: Hex; slip44: number }>> =
  { [CHAIN_IDS.POLYGON]: { address: POLYGON_NATIVE_TOKEN, slip44: 966 } };

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
 * CAIP-19 id of the asset an MM Pay deposit settles in, resolved the way
 * `@metamask/transaction-pay-controller` resolves it for `getQuotes` by
 * default: the `assetPerTransactionType` flag override, then that package's
 * defaults, then ETH mainnet. Matches the transaction or any nested one, so
 * batches resolve too; returns `''` when nothing matches, which leaves the
 * payment-methods query idle rather than fetching a catalog nobody asked for.
 *
 * The money branch resolves Monad mUSD unconditionally, matching the surfaces
 * that already own this answer rather than introducing a third one: the
 * provider switch in `money-account-deposit-info.tsx` pins the same expression
 * with no flag check, and the fiat entry gate in `MoneyAddMoneySheet.tsx` reads
 * `useMoneyAccountDepositAssetId()`, which resolves the vault-config chain with
 * a Monad fallback (`0x8f` in the shipped config). Being unconditional is
 * therefore inherited from MM Pay, not new here.
 *
 * One consequence to know about, shared with those surfaces rather than
 * introduced by this catalog: none of the three consults
 * `directMoneyMusdEnabled`, so if that flag is used as a kill switch, TPC
 * quotes ETH mainnet on the relay path while all three stay mUSD-scoped. The
 * `moneyAccountDeposit` entry of `confirmations_pay_fiat.assetPerTransactionType`
 * is likewise inert in the Ramps layer, as it already is on TPC's direct path.
 * Single-sourcing this in TPC (see the TODO) resolves it for all three at once.
 *
 * TODO: `@metamask/transaction-pay-controller` owns both halves of this
 * (`FIAT_ASSET_ID_BY_TX_TYPE` and `buildCaipAssetType`) and exports neither,
 * so this file mirrors them. Reading TPC's own `fiatPayment.caipAssetId`
 * instead is circular: TPC writes it only inside quote execution, which
 * returns early unless an amount and a selected payment method already exist,
 * and this catalog is what produces that selection. The fix is for TPC to
 * resolve the asset when the transaction is added, so this file can go.
 */
export function deriveFiatDepositAssetId(
  transaction: TransactionMeta | undefined,
  enabledTypes: TransactionType[],
  assetPerTransactionType?: Partial<Record<TransactionType, FiatDepositAsset>>,
): string {
  // Nested order decides which deposit type wins, matching TPC's
  // `resolveTransactionType`; picking by `enabledTypes` order instead would let
  // remote-flag array order change the answer.
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

  if (txType === TransactionType.moneyAccountDeposit) {
    return MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD];
  }

  return toAssetId(
    assetPerTransactionType?.[txType] ??
      DEFAULT_ASSET_BY_TX_TYPE[txType] ??
      ETH_MAINNET,
  );
}
