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
import { AddressBookControllerState } from '@metamask/address-book-controller';

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
 * Builds a normalized Set of trusted addresses for O(1) lookup.
 * Includes all of the user's own account addresses and every entry in
 * the address book (across all chains — EVM addresses are identical on
 * every EVM network).
 *
 * Call this once per render cycle (e.g. via useMemo) and pass the result
 * into isTrustedAddress / the filter functions.
 *
 * @param addressBook - Address book state from AddressBookController
 * @param internalAccountAddresses - Array of the user's account addresses
 * @returns A Set of lowercased trusted addresses
 */
export const buildTrustedAddressSet = (
  addressBook: AddressBookControllerState['addressBook'],
  internalAccountAddresses: string[],
): Set<string> => {
  const set = new Set<string>();
  internalAccountAddresses.forEach((addr) => set.add(addr.toLowerCase()));
  Object.values(addressBook ?? {}).forEach((chainBook) =>
    Object.values(chainBook ?? {}).forEach((entry) =>
      set.add(entry.address.toLowerCase()),
    ),
  );
  return set;
};

/**
 * Checks if an address is trusted via an O(1) Set lookup.
 * Build the Set once per render cycle with buildTrustedAddressSet.
 *
 * @param address - Address to check
 * @param trustedAddresses - Pre-built Set of lowercased trusted addresses
 * @returns Boolean indicating if address is trusted
 */
export const isTrustedAddress = (
  address: string,
  trustedAddresses: Set<string>,
): boolean => {
  if (!address) {
    return false;
  }
  return trustedAddresses.has(address.toLowerCase());
};

/**
 * Shared logic for address-poisoning protection on token transfers.
 * Used by both filterByAddressAndNetwork and filterByAddress so security
 * policy stays in one place.
 *
 * @param from - Sender address
 * @param selectedAddress - Current wallet address
 * @param tokens - User's tokens (to check if transfer token is in wallet)
 * @param transferContractAddress - Contract address of the transferred token
 * @param trustedAddresses - Pre-built Set of lowercased trusted addresses
 * @returns true if the transfer should be shown (outgoing, or incoming from trusted sender with token)
 */
function shouldShowTransferByAddress(
  from: string,
  selectedAddress: string,
  tokens: { address: string }[],
  transferContractAddress: string | undefined,
  trustedAddresses: Set<string>,
): boolean {
  if (areAddressesEqual(from, selectedAddress)) {
    return true;
  }

  const hasToken = !!tokens.find(({ address }) =>
    areAddressesEqual(address, transferContractAddress ?? ''),
  );

  if (hasToken) {
    return isTrustedAddress(from, trustedAddresses);
  }

  return false;
}

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
  trustedAddresses: Set<string>,
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
      ? shouldShowTransferByAddress(
          from,
          selectedAddress,
          tokens,
          transferInformation?.contractAddress,
          trustedAddresses,
        )
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
  trustedAddresses: Set<string>,
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
      ? shouldShowTransferByAddress(
          from,
          selectedAddress,
          tokens,
          transferInformation?.contractAddress,
          trustedAddresses,
        )
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
        item.txMetaId &&
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
