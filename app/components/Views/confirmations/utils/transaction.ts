import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { Interface } from '@ethersproject/abi';
import {
  TransactionMeta,
  TransactionParams,
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
  types: TransactionType[],
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
 * Withdrawal transaction types that use a "Receive as" token picker
 * instead of "Pay with" for selecting the destination token.
 */
const WITHDRAWAL_TRANSACTION_TYPES = [
  TransactionType.predictWithdraw,
  // TransactionType.perpsWithdraw, // Add when implementing for Perps
] as const;

/**
 * Checks if the transaction is a withdrawal type (predictWithdraw, perpsWithdraw, etc.)
 * Withdrawal transactions use "Receive as" instead of "Pay with" for token selection.
 */
export function isWithdrawalTransaction(
  transactionMeta: TransactionMeta | undefined,
): boolean {
  return hasTransactionType(
    transactionMeta,
    WITHDRAWAL_TRANSACTION_TYPES as unknown as TransactionType[],
  );
}
