import { safeToChecksumAddress } from '../../util/address';
import { toLowerCaseEquals } from '../../util/general';
import { TX_UNAPPROVED } from '../../constants/transaction';

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
): boolean =>
  toLowerCaseEquals(safeToChecksumAddress(from), selectedAddress) ||
  toLowerCaseEquals(safeToChecksumAddress(to), selectedAddress);

/**
 * Determines if a transaction was executed in the current chain/network
 * @param tx - Transaction to evaluate
 * @param networkId - Current network id
 * @param chainId - Current chain id
 * @returns Boolean indicating if the transaction was executed in current chain
 */
export const isFromCurrentChain = (
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
export const sortTransactions = (transactions: any[]): any[] =>
  transactions.sort((a, b) => (a.time > b.time ? -1 : b.time > a.time ? 1 : 0));

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
  tx: any,
  tokens: any[],
  selectedAddress: string,
  networkId: string,
  chainId: string,
): boolean => {
  const {
    transaction: { from, to },
    isTransfer,
    transferInformation,
  } = tx;

  if (
    isFromOrToSelectedAddress(from, to, selectedAddress) &&
    isFromCurrentChain(tx, networkId, chainId) &&
    tx.status !== TX_UNAPPROVED
  ) {
    return isTransfer
      ? !!tokens.find(({ address }) =>
          toLowerCaseEquals(address, transferInformation.contractAddress),
        )
      : true;
  }
  return false;
};
