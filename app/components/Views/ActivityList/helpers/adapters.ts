import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  APPROVE_FUNCTION_SIGNATURE,
  INCREASE_ALLOWANCE_SIGNATURE,
  NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE,
  SET_APPROVAL_FOR_ALL_SIGNATURE,
  TRANSFER_FROM_FUNCTION_SIGNATURE,
  TRANSFER_FUNCTION_SIGNATURE,
} from '../../../../util/transactions';
import { Hex } from 'viem';
import { toHex } from '@metamask/controller-utils';

// Ported from transaction-controller
// - AccountsApiRemoteTransactionSource
// - determineTransactionType
function resolveTransactionMetaType(
  transaction: V1TransactionByHashResponse,
  isOutgoing: boolean,
) {
  if (!isOutgoing) {
    return TransactionType.incoming;
  }

  const rawData = transaction.methodId?.toLowerCase();
  // Treat '0x' (empty calldata) the same as no methodId, since the API
  // returns '0x' for simple ETH sends.
  const data = rawData && rawData !== '0x' ? rawData : undefined;

  if (data && !transaction.to) {
    return TransactionType.deployContract;
  }

  const isContractAddress = Boolean(data?.length);

  if (!isContractAddress) {
    return TransactionType.simpleSend;
  }

  const hasValue = BigInt(transaction.value ?? '0') !== BigInt(0);

  if (hasValue) {
    return TransactionType.contractInteraction;
  }

  if (!data) {
    return TransactionType.contractInteraction;
  }

  switch (data) {
    case APPROVE_FUNCTION_SIGNATURE:
      return TransactionType.tokenMethodApprove;
    case SET_APPROVAL_FOR_ALL_SIGNATURE:
      return TransactionType.tokenMethodSetApprovalForAll;
    case TRANSFER_FUNCTION_SIGNATURE:
      return TransactionType.tokenMethodTransfer;
    case TRANSFER_FROM_FUNCTION_SIGNATURE:
      return TransactionType.tokenMethodTransferFrom;
    case NFT_SAFE_TRANSFER_FROM_FUNCTION_SIGNATURE:
      return TransactionType.tokenMethodSafeTransferFrom;
    case INCREASE_ALLOWANCE_SIGNATURE:
      return TransactionType.tokenMethodIncreaseAllowance;
    default:
      return TransactionType.contractInteraction;
  }
}

// Ported from transaction-controller normalizeTransaction
export function normalizeTransaction(
  address: string,
  transaction: V1TransactionByHashResponse,
) {
  const { from, hash, methodId } = transaction;
  const normalizedAddress = address.toLowerCase();

  const status = transaction.isError
    ? TransactionStatus.failed
    : TransactionStatus.confirmed;

  // Find token transfer that involves the current address
  const valueTransfer = transaction.valueTransfers?.find(
    (vt) =>
      (vt.to?.toLowerCase() === normalizedAddress ||
        vt.from?.toLowerCase() === normalizedAddress) &&
      vt.contractAddress,
  );

  const isIncomingTokenTransfer =
    valueTransfer?.to?.toLowerCase() === normalizedAddress &&
    from.toLowerCase() !== normalizedAddress;
  const isOutgoing = from.toLowerCase() === normalizedAddress;

  const transferInformation = valueTransfer
    ? {
        amount: valueTransfer.amount,
        contractAddress: valueTransfer.contractAddress,
        decimals: valueTransfer.decimal,
        symbol: valueTransfer.symbol,
      }
    : undefined;

  const meta: TransactionMeta = {
    blockNumber: String(transaction.blockNumber),
    chainId: toHex(transaction.chainId),
    error: transaction.isError ? new Error('Transaction failed') : undefined,
    hash,
    id: `${hash}-${transaction.chainId}`,
    isTransfer: isIncomingTokenTransfer,
    networkClientId: '',
    status,
    time: Date.parse(transaction.timestamp) || 0,
    toSmartContract: false,
    transferInformation,
    txParams: {
      chainId: toHex(transaction.chainId),
      data: methodId as Hex,
      from: from as Hex,
      gas: toHex(transaction.gas),
      gasPrice: toHex(transaction.gasPrice),
      gasUsed: toHex(transaction.gasUsed),
      nonce: toHex(transaction.nonce),
      to: isIncomingTokenTransfer ? address : transaction.to,
      value: toHex(
        isIncomingTokenTransfer
          ? (valueTransfer?.amount ?? transaction.value)
          : transaction.value,
      ),
    },
    type: resolveTransactionMetaType(transaction, isOutgoing),
    verifiedOnBlockchain: false,
  };

  return meta;
}
