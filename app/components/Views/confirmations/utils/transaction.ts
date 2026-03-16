import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Interface } from '@ethersproject/abi';
import {
  TransactionMeta,
  TransactionParams,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  abiERC721,
  abiERC20,
  abiERC1155,
  abiFiatTokenV2,
} from '@metamask/metamask-eth-abis';

import ppomUtil from '../../../../lib/ppom/ppom-util';
import { addTransaction } from '../../../../util/transaction-controller';
import { POST_QUOTE_TRANSACTION_TYPES } from '../constants/confirmations';
import { Severity } from '../components/status-icon';

const erc20Interface = new Interface(abiERC20);
const erc721Interface = new Interface(abiERC721);
const erc1155Interface = new Interface(abiERC1155);
const USDCInterface = new Interface(abiFiatTokenV2);

const ABI_PERMIT_2_APPROVE = {
  inputs: [
    { internalType: 'address', name: 'token', type: 'address' },
    { internalType: 'address', name: 'spender', type: 'address' },
    { internalType: 'uint160', name: 'amount', type: 'uint160' },
    { internalType: 'uint48', name: 'expiration', type: 'uint48' },
  ],
  name: 'approve',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
};
const permit2Interface = new Interface([ABI_PERMIT_2_APPROVE]);

export function parseStandardTokenTransactionData(data?: string) {
  if (!data) {
    return undefined;
  }

  try {
    return erc20Interface.parseTransaction({ data });
  } catch {
    // ignore and next try to parse with erc721 ABI
  }

  try {
    return erc721Interface.parseTransaction({ data });
  } catch {
    // ignore and next try to parse with erc1155 ABI
  }

  try {
    return erc1155Interface.parseTransaction({ data });
  } catch {
    // ignore and return undefined
  }

  try {
    return USDCInterface.parseTransaction({ data });
  } catch {
    // ignore and return undefined
  }

  try {
    return permit2Interface.parseTransaction({ data });
  } catch {
    // ignore and return undefined
  }

  return undefined;
}

export async function addMMOriginatedTransaction(
  txParams: TransactionParams,
  options: {
    networkClientId: string;
    type?: TransactionType;
  },
): Promise<TransactionMeta> {
  const { transactionMeta } = await addTransaction(txParams, {
    ...options,
    origin: ORIGIN_METAMASK,
  });

  const id = transactionMeta.id;
  const reqObject = {
    id,
    jsonrpc: '2.0',
    method: 'eth_sendTransaction',
    origin: ORIGIN_METAMASK,
    params: [txParams],
  };

  ppomUtil.validateRequest(reqObject, { transactionMeta });

  return transactionMeta;
}

export function get4ByteCode(data: string) {
  return data.slice(0, 10).toLowerCase();
}

export function hasTransactionType(
  transactionMeta: TransactionMeta | undefined,
  types: readonly TransactionType[],
) {
  const { nestedTransactions, type } = transactionMeta ?? {};

  if (types.includes(type as TransactionType)) {
    return true;
  }

  return (
    nestedTransactions?.some((tx) =>
      types.includes(tx.type as TransactionType),
    ) ?? false
  );
}

/**
 * Checks if the transaction is a post-quote type (predictWithdraw, perpsWithdraw, etc.)
 * Post-quote transactions use "Receive as" instead of "Pay with" for token selection.
 */
export function isTransactionPayWithdraw(
  transactionMeta: TransactionMeta | undefined,
): boolean {
  return hasTransactionType(
    transactionMeta,
    POST_QUOTE_TRANSACTION_TYPES as unknown as TransactionType[],
  );
}

/**
 * Returns the matching post-quote transaction type (e.g. "predictWithdraw")
 * for the given transaction metadata. Used to look up override config in
 * the confirmations_pay_post_quote feature flag.
 */
export function getPostQuoteTransactionType(
  transactionMeta: TransactionMeta | undefined,
): string | undefined {
  if (!transactionMeta) {
    return undefined;
  }

  return POST_QUOTE_TRANSACTION_TYPES.find((type) =>
    hasTransactionType(transactionMeta, [type as unknown as TransactionType]),
  );
}

export function getSeverity(status: TransactionStatus): Severity {
  switch (status) {
    case TransactionStatus.confirmed:
      return 'success';
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return 'error';
    default:
      return 'warning';
  }
}

export function getErrorMessage(
  transactionMeta: TransactionMeta,
): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Intentionally empty
    }
  }

  return error.message;
}
