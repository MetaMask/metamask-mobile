import { areAddressesEqual } from '../../util/address';
import { TX_UNAPPROVED } from '../../constants/transaction';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { uniq } from 'lodash';
import { Hex } from '@metamask/utils';
import { hasTransactionType } from '../../components/Views/confirmations/utils/transaction';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';

export const PAY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

/**
 * Determines if the transaction is from or to the current wallet
 * @param from Transaction sender address
 * @param to Transaction receiver address
 * @param selectedAddress Current wallet address
 * @returns Boolean indicating if the current address is the sender or receiver
 */
export const isFromOrToSelectedAddress = (
  from: string,
  to: string,
  selectedAddress: string,
): boolean => {
  if (!selectedAddress) {
    return false;
  }
  if (from && areAddressesEqual(from, selectedAddress)) {
    return true;
  }

  if (to && areAddressesEqual(to, selectedAddress)) {
    return true;
  }

  return false;
};

/**
 * Determines if a transaction was executed in the current chain/network
 * @param tx - Transaction to evaluate
 * @param networkId - Current network id
 * @param chainId - Current chain id
 * @returns Boolean indicating if the transaction was executed in current chain
 */
export const isFromCurrentChain = (
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  networkId: string,
  chainId: string,
): boolean =>
  chainId === tx.chainId || (!tx.chainId && networkId === tx.networkID);

/**
 * Sorts an array of transaction based on the timestamp
 * @param transactions Array of transactions
 * @returns Sorted array
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sortTransactions = (transactions: any[]): any[] =>
  [...transactions].sort((a, b) => {
    if (a.time > b.time) return -1;
    if (a.time < b.time) return 1;
    return 0;
  });

/**
 * Filter based on the following conditions:
 * 1. The transaction is from/to the current address
 * 2. The transaction was executed in the current chain
 * 3. The status of the transaction is different to 'unapproved'
 * 4. If the transaction is a token transfer, the user must have that token in the wallet
 * @param tx - Transaction to evaluate
 * @param tokens - Arrays of tokens
 * @param selectedAddress - Current wallet address
 * @param networkId - Current network ID
 * @param chainId - Current chain ID
 * @returns A boolean indicating if the transaction meets the conditions
 */
export const filterByAddressAndNetwork = (
  tx: TransactionMeta,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: any[],
  selectedAddress: string,
  tokenNetworkFilter: { [key: string]: boolean },
  allTransactions: TransactionMeta[],
  bridgeHistory: Record<string, BridgeHistoryItem>,
): boolean => {
  const {
    isTransfer,
    transferInformation,
    txParams: { from, to },
  } = tx;

  if (isFilteredByMetaMaskPay(tx, allTransactions ?? [], bridgeHistory)) {
    return false;
  }

  const validChainIds = Object.keys(tokenNetworkFilter) as Hex[];

  const condition = isTransactionOnChains(
    tx,
    validChainIds,
    allTransactions ?? [],
  );

  if (
    isFromOrToSelectedAddress(from, to ?? '', selectedAddress) &&
    condition &&
    tx.status !== TX_UNAPPROVED
  ) {
    const result = isTransfer
      ? !!tokens.find(({ address }) =>
          areAddressesEqual(
            address,
            transferInformation?.contractAddress ?? '',
          ),
        ) || areAddressesEqual(from, selectedAddress) // Allow if sender is current address
      : true;

    return result;
  }

  return false;
};

export const filterByAddress = (
  tx: TransactionMeta,
  tokens: { address: string }[],
  selectedAddress: string,
  allTransactions: TransactionMeta[],
  bridgeHistory: Record<string, BridgeHistoryItem>,
): boolean => {
  const {
    isTransfer,
    transferInformation,
    txParams: { from, to },
  } = tx;

  if (isFilteredByMetaMaskPay(tx, allTransactions ?? [], bridgeHistory)) {
    return false;
  }

  if (
    isFromOrToSelectedAddress(from, to ?? '', selectedAddress) &&
    tx.status !== TX_UNAPPROVED
  ) {
    const result = isTransfer
      ? !!tokens.find(({ address }) =>
          areAddressesEqual(
            address,
            transferInformation?.contractAddress ?? '',
          ),
        ) || areAddressesEqual(from, selectedAddress) // Allow if sender is current address
      : true;

    return result;
  }

  return false;
};

export function isTransactionOnChains(
  transaction: TransactionMeta,
  chainIds: Hex[],
  allTransactions: TransactionMeta[],
): boolean {
  const { chainId, requiredTransactionIds, type } = transaction;

  // Hide Perps deposit transaction if it was funded by a non-selected chain.
  if (type === TransactionType.perpsDeposit && requiredTransactionIds?.length) {
    const requiredTransaction = allTransactions.find(
      (t) => t.id === requiredTransactionIds[0],
    );

    if (
      requiredTransaction &&
      !chainIds.includes(requiredTransaction.chainId)
    ) {
      return false;
    }
  }

  if (chainIds.includes(chainId)) {
    return true;
  }

  const requiredTransactionChainIds = uniq(
    allTransactions
      .filter((t) => requiredTransactionIds?.includes(t.id))
      .map((t) => t.chainId),
  );

  return requiredTransactionChainIds.some((id) => chainIds.includes(id));
}

function isFilteredByMetaMaskPay(
  tx: TransactionMeta,
  allTransactions: TransactionMeta[],
  bridgeHistory: Record<string, BridgeHistoryItem>,
): boolean {
  const { batchId, id: transactionId, isIntentComplete } = tx;

  if (isIntentComplete) {
    return false;
  }

  const requiredTransactionIds = allTransactions
    ?.map((t) => t.requiredTransactionIds ?? [])
    .flat();

  const isRequiredTransaction = requiredTransactionIds?.includes(transactionId);

  if (isRequiredTransaction) {
    return true;
  }

  const isBridgeReceive =
    tx.hash &&
    Object.values(bridgeHistory).some(
      (item) =>
        item.status.destChain?.txHash?.toLowerCase() ===
          tx.hash?.toLowerCase() &&
        requiredTransactionIds.includes(item.txMetaId),
    );

  if (isBridgeReceive) {
    return true;
  }

  const requiredTransactionHashes = allTransactions
    ?.filter((t) => requiredTransactionIds?.includes(t.id) && t.hash)
    .map((t) => t.hash?.toLowerCase());

  if (requiredTransactionHashes?.includes(tx.hash?.toLowerCase())) {
    return true;
  }

  const isInPayBatch =
    !hasTransactionType(tx, PAY_TYPES) &&
    Boolean(batchId) &&
    allTransactions?.some(
      (t) => t.batchId === batchId && hasTransactionType(t, PAY_TYPES),
    );

  return isInPayBatch;
}
