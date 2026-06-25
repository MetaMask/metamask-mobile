import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  isMusdOnMoneyAccountChain,
  isMusdToken,
} from '../../Earn/constants/musd';

/**
 * Returns the first nested transaction matching a given TransactionType,
 * or undefined if none exists.
 */
export const nestedTxWithType = (
  transactionMeta: TransactionMeta,
  targetType: TransactionType,
) =>
  transactionMeta.nestedTransactions?.find(
    (nested) => nested.type === targetType,
  );

export const isMoneyDepositTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountDeposit ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountDeposit),
  );

export const isMoneyWithdrawTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountWithdraw ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountWithdraw),
  );

/**
 * True when a Money Account withdrawal lands as mUSD (single-row hero and
 * "Sent mUSD" title). Cross-token destinations (e.g. USDC) return false.
 * Chain is irrelevant — only the destination token matters.
 */
export const isSingleRowMusdMoneyWithdraw = (
  transactionMeta: TransactionMeta,
): boolean => {
  if (!isMoneyWithdrawTx(transactionMeta)) {
    return false;
  }
  return isMusdToken(transactionMeta.metamaskPay?.tokenAddress);
};

export const isMoneyAccountTx = (transactionMeta: TransactionMeta) =>
  isMoneyDepositTx(transactionMeta) || isMoneyWithdrawTx(transactionMeta);

/**
 * Perps/Predict deposit parent types (money → service). When funded from the
 * Money account these are paid with mUSD via MetaMask Pay; the on-chain deposit
 * is signed from the user's EOA on the service chain (Arbitrum/Polygon)
 **/
export const PERPS_PREDICT_DEPOSIT_TYPES: TransactionType[] = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
];

/**
 * Perps/Predict withdraw types (service → money). When the destination is the
 * Money account these arrive as mUSD on Monad. The withdraw is wrapped in an
 * EIP-7702 `batch`, so the type sits in `nestedTransactions`.
 */
export const PERPS_PREDICT_WITHDRAW_TYPES: TransactionType[] = [
  TransactionType.perpsWithdraw,
  TransactionType.predictWithdraw,
];

/**
 * The Perps/Predict deposit or withdraw type for a tx, unwrapping an EIP-7702
 * `batch` whose money-moving call sits in `nestedTransactions`.
 */
const effectiveServiceType = (
  transactionMeta: TransactionMeta,
): TransactionType | undefined => {
  const serviceTypes = [
    ...PERPS_PREDICT_DEPOSIT_TYPES,
    ...PERPS_PREDICT_WITHDRAW_TYPES,
  ];
  if (
    transactionMeta.type &&
    serviceTypes.includes(transactionMeta.type as TransactionType)
  ) {
    return transactionMeta.type as TransactionType;
  }
  return transactionMeta.nestedTransactions?.find(
    (nested) => nested.type && serviceTypes.includes(nested.type),
  )?.type;
};

/**
 * True when the `metamaskPay` token is mUSD on the Money account chain (Monad).
 * For a deposit this is the source the Money account paid; for a withdraw
 * (`isPostQuote`) it's the destination — either way it links the tx to the
 * Money account.
 */
const isMusdMoneyPayToken = (transactionMeta: TransactionMeta): boolean =>
  isMusdOnMoneyAccountChain(
    transactionMeta.metamaskPay?.tokenAddress,
    transactionMeta.metamaskPay?.chainId as Hex | undefined,
  );

/**
 * Perps/Predict deposit funded from the Money account —
 * from the perspective of the money account this a 'Send'.
 * The tx `from` is the user's EOA, not the Money account, so it's matched via
 * the mUSD pay token rather than the address.
 */
export const isPerpsPredictMoneyDeposit = (
  transactionMeta: TransactionMeta,
): boolean => {
  const type = effectiveServiceType(transactionMeta);
  return (
    Boolean(type) &&
    PERPS_PREDICT_DEPOSIT_TYPES.includes(type as TransactionType) &&
    isMusdMoneyPayToken(transactionMeta)
  );
};

/**
 * Perps/Predict withdraw landing in the Money account — an inflow ("Deposited").
 */
export const isPerpsPredictMoneyWithdraw = (
  transactionMeta: TransactionMeta,
): boolean => {
  const type = effectiveServiceType(transactionMeta);
  return (
    Boolean(type) &&
    PERPS_PREDICT_WITHDRAW_TYPES.includes(type as TransactionType) &&
    isMusdMoneyPayToken(transactionMeta)
  );
};

export const isPerpsPredictMoneyActivity = (
  transactionMeta: TransactionMeta,
): boolean =>
  isPerpsPredictMoneyDeposit(transactionMeta) ||
  isPerpsPredictMoneyWithdraw(transactionMeta);

/**
 * The service family ('perps' | 'predict') for a Perps/Predict ↔ Money tx, used
 * to label the activity row's subtitle. Returns undefined for other txs.
 */
export const perpsPredictServiceFamily = (
  transactionMeta: TransactionMeta,
): 'perps' | 'predict' | undefined => {
  const type = effectiveServiceType(transactionMeta);
  if (
    type === TransactionType.perpsDeposit ||
    type === TransactionType.perpsDepositAndOrder ||
    type === TransactionType.perpsWithdraw
  ) {
    return 'perps';
  }
  if (
    type === TransactionType.predictDeposit ||
    type === TransactionType.predictDepositAndOrder ||
    type === TransactionType.predictWithdraw
  ) {
    return 'predict';
  }
  return undefined;
};

/**
 * Resolves source and destination chain IDs for MM Pay transaction.
 *
 * `metamaskPay.chainId` is the payment-token chain. Its role flips based on
 * `isPostQuote`: for withdrawals (post-quote) it's the destination, for
 * deposits it's the source.
 */
export const getMMPayChainIds = (
  transactionMeta: TransactionMeta,
): { sourceChainId: Hex | undefined; destinationChainId: Hex | undefined } => {
  const local = transactionMeta.chainId;
  const pay = transactionMeta.metamaskPay?.chainId as Hex | undefined;

  return transactionMeta.metamaskPay?.isPostQuote
    ? { sourceChainId: local, destinationChainId: pay }
    : { sourceChainId: pay ?? local, destinationChainId: local };
};
