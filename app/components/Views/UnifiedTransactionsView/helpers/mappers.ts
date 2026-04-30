import {
  type V1TransactionByHashResponse,
  type V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { numberToHex, type CaipChainId } from '@metamask/utils';
import type { InfiniteData } from '@tanstack/react-query';
import { NATIVE_TOKEN_ADDRESS } from '../../confirmations/constants/tokens';
import type { ConfirmedEvmTransaction } from './types';

export interface ActivityHistoryQueryParams {
  accountAddresses: readonly string[];
  networks: readonly CaipChainId[];
}

const EXCLUDED_TRANSACTION_TYPES = ['SPAM_TOKEN_TRANSFER'];

// The API returns CAIP-10 account IDs, but the filtering logic only needs the
// plain wallet address when deciding whether a tx belongs to the active account.
const getPlainAddresses = (accountAddresses: readonly string[]) =>
  [
    ...new Set(
      accountAddresses
        .map((accountAddress) => accountAddress.split(':').pop()?.toLowerCase())
        .filter(Boolean),
    ),
  ] as string[];

// Pick the active account address that this tx belongs to. We prefer `from`
// first so sent transactions keep the sender context when later normalized.
const findMatchingAddress = (
  plainAddresses: Set<string>,
  transaction: V1TransactionByHashResponse,
) => {
  const from = transaction.from?.toLowerCase();
  const to = transaction.to?.toLowerCase();

  if (from && plainAddresses.has(from)) {
    return from;
  }

  if (to && plainAddresses.has(to)) {
    return to;
  }

  return undefined;
};

// Extension drops inbound token transfers from the history query. We keep the
// same rule here before adapting the API row into mobile's TransactionMeta shape.
const isIncomingTokenTransfer = (
  address: string,
  transaction: V1TransactionByHashResponse,
) =>
  transaction.valueTransfers?.some(
    (transfer) =>
      Boolean(transfer.contractAddress) &&
      transfer.to?.toLowerCase() === address &&
      transaction.from?.toLowerCase() !== address,
  ) ?? false;

// Lightweight transfer summary used for address-poisoning checks in the same
// style as the extension-side query transformation.
const parseValueTransfers = (
  address: string,
  transaction: V1TransactionByHashResponse,
) => {
  const normalizedAddress = address.toLowerCase();
  const result: {
    from?: { token: { address: string } };
    to?: { token: { address: string } };
  } = {};

  for (const transfer of transaction.valueTransfers ?? []) {
    const tokenAddress =
      transfer.contractAddress?.toLowerCase() || NATIVE_TOKEN_ADDRESS;

    if (!result.from && transfer.from?.toLowerCase() === normalizedAddress) {
      result.from = { token: { address: tokenAddress } };
    }

    if (!result.to && transfer.to?.toLowerCase() === normalizedAddress) {
      result.to = { token: { address: tokenAddress } };
    }

    if (result.from && result.to) {
      break;
    }
  }

  return result;
};

// The backend returns some numeric fields as decimal strings. TransactionMeta
// expects hex-encoded txParams, so this normalizes them for TransactionElement.
const decimalToHex = (value: string | number | undefined | null) => {
  if (value === undefined || value === null) {
    return '0x0';
  }

  try {
    return `0x${BigInt(value).toString(16)}`;
  } catch {
    return '0x0';
  }
};

// TransactionElement and util/activity fall back to `transferInformation`
// when calldata is truncated or token metadata is not already in state. This
// adapter recreates the minimal shape those utilities already understand.
const getTransferInformation = (
  address: string,
  tx: V1TransactionByHashResponse,
) => {
  const normalizedAddress = address.toLowerCase();
  const transfer = tx.valueTransfers?.find(
    (valueTransfer) =>
      Boolean(valueTransfer.contractAddress) &&
      (valueTransfer.from?.toLowerCase() === normalizedAddress ||
        valueTransfer.to?.toLowerCase() === normalizedAddress),
  );

  if (!transfer?.contractAddress) {
    return undefined;
  }

  return {
    amount: transfer.amount,
    contractAddress: transfer.contractAddress,
    decimals: transfer.decimal,
    symbol: transfer.symbol,
    recipient: transfer.to,
  };
};

// Build the TransactionMeta compatibility object that TransactionElement
// already expects. The raw API fields stay on the outer object so we do not
// have to merge conflicting TransactionMeta and backend response properties.
const normalizeTransaction = (
  address: string,
  tx: V1TransactionByHashResponse,
): ConfirmedEvmTransaction => {
  const txChainId = numberToHex(tx.chainId);
  const transferInformation = getTransferInformation(address, tx);
  const time = Date.parse(tx.timestamp) || 0;
  const id = `${txChainId}-${tx.hash}`;
  const transactionMeta = {
    blockNumber: String(tx.blockNumber),
    chainId: txChainId,
    error: tx.isError ? new Error('Transaction failed') : undefined,
    hash: tx.hash,
    id,
    networkClientId: '',
    status: tx.isError ? TransactionStatus.failed : TransactionStatus.confirmed,
    time,
    toSmartContract: false,
    transferInformation,
    txParams: {
      chainId: txChainId,
      data: tx.methodId || '0x',
      from: tx.from,
      gas: decimalToHex(tx.gas),
      gasPrice: decimalToHex(tx.gasPrice),
      gasUsed: decimalToHex(tx.gasUsed),
      nonce: decimalToHex(tx.nonce),
      to: tx.to,
      value: decimalToHex(tx.value),
    },
    type:
      tx.methodId && tx.methodId !== '0x'
        ? TransactionType.contractInteraction
        : TransactionType.simpleSend,
    verifiedOnBlockchain: true,
  };

  return {
    ...tx,
    id,
    time,
    transactionMeta,
    txChainId,
  };
};

// Shared normalizer used by Activity and TokenDetails so both surfaces adapt
// backend-confirmed EVM rows the same way before rendering.
export const normalizeTransactions = (
  address: string,
  transactions: V1TransactionByHashResponse[],
) =>
  transactions
    .map((tx): ConfirmedEvmTransaction => normalizeTransaction(address, tx))
    .filter(
      (tx, index, self) =>
        index ===
        self.findIndex(
          (candidate) =>
            candidate.hash === tx.hash && candidate.txChainId === tx.txChainId,
        ),
    );

// React Query `select` callback that applies the extension-style filtering
// rules first, then adapts the surviving rows into TransactionMeta-like items
// for the existing mobile Activity renderers.
export const selectConfirmedTransactions =
  ({ accountAddresses }: { accountAddresses: readonly string[] }) =>
  (data: InfiniteData<V4MultiAccountTransactionsResponse>) => {
    const plainAddresses = new Set(getPlainAddresses(accountAddresses));

    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        data: page.data
          .reduce<ConfirmedEvmTransaction[]>((result, raw) => {
            const matchedAddress = findMatchingAddress(plainAddresses, raw);

            if (!matchedAddress) {
              return result;
            }

            const rawFrom = raw.from?.toLowerCase();
            const rawTo = raw.to?.toLowerCase();

            if (
              EXCLUDED_TRANSACTION_TYPES.includes(raw.transactionType ?? '')
            ) {
              return result;
            }

            if (
              rawFrom === matchedAddress &&
              rawTo === matchedAddress &&
              raw.value === '0' &&
              !raw.valueTransfers?.length &&
              (!raw.methodId || raw.methodId === '0x')
            ) {
              return result;
            }

            if (isIncomingTokenTransfer(matchedAddress, raw)) {
              return result;
            }

            const amounts = parseValueTransfers(matchedAddress, raw);

            if (
              rawFrom !== matchedAddress &&
              amounts.to?.token.address === NATIVE_TOKEN_ADDRESS &&
              !amounts.from
            ) {
              return result;
            }

            result.push(normalizeTransaction(matchedAddress, raw));

            return result;
          }, [])
          .filter(
            (tx, index, self) =>
              index ===
              self.findIndex(
                (candidate) =>
                  candidate.hash === tx.hash &&
                  candidate.txChainId === tx.txChainId,
              ),
          ),
      })),
    };
  };
