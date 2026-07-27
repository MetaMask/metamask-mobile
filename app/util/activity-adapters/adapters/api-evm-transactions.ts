/*
 * Vendored from metamask-extension shared/lib/activity/adapters/api-evm-transactions.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 *
 * Extension dependencies are provided via ActivityAdapterEnvironment.
 */
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { KnownCaipNamespace, toCaipChainId } from '@metamask/utils';
import { isValidHexAddress } from '@metamask/controller-utils';
import type { ActivityListItem, Status, TokenAmount } from '../types';
import { supplyMethodIds } from './constants';
import {
  getNftPaymentTransfer,
  getTokenMetadataFromKnownToken,
  getTokenAmountFromTransfer,
  getTokenApprovalAmountFromData,
  isUnlimitedApprovalAmount,
  getApiTransactionFees,
  parseValueTransfers,
  withFallbackTokenAssetId,
  type ValueTransfer,
} from './helpers';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

function getTransactionCalldata(
  transaction: V1TransactionByHashResponse,
): string | undefined {
  const maybeTransaction = transaction as unknown as Record<string, unknown>;
  const data =
    maybeTransaction.input ??
    maybeTransaction.data ??
    maybeTransaction.txData ??
    maybeTransaction.transactionData;

  return typeof data === 'string' && data.length > 10 ? data : undefined;
}

// Converts indexed API transactions into the shared activity item shape
export function mapApiEvmTransactions({
  subjectAddress,
  transaction,
  environment = mobileActivityAdapterEnvironment,
}: {
  subjectAddress: string;
  transaction: V1TransactionByHashResponse;
  environment?: ActivityAdapterEnvironment;
}): ActivityListItem {
  const { hash, transactionCategory, valueTransfers } = transaction;
  const status: Status = transaction.isError ? 'failed' : 'success';
  const timestamp = new Date(transaction.timestamp).getTime();
  const chainId = toCaipChainId(
    KnownCaipNamespace.Eip155,
    transaction.chainId.toString(),
  );
  const hexChainId = `0x${transaction.chainId.toString(16)}`;
  const fees = getApiTransactionFees(
    transaction,
    environment.getNativeAssetForChainId(hexChainId),
  );
  const getToken = (
    transfer: ValueTransfer | undefined,
    direction: TokenAmount['direction'],
  ) => getTokenAmountFromTransfer(transfer, direction, chainId, environment);

  const {
    sentTransfer,
    receivedTransfer,
    sentNftTransfer,
    receivedNftTransfer,
    sentNativeTransfer,
    receivedNativeTransfer,
  } = parseValueTransfers(valueTransfers, subjectAddress, environment);
  const wrappedTokenAddress = environment.wrappedTokenAddresses[hexChainId];
  const isDirectWrappedTokenCall =
    Boolean(wrappedTokenAddress) &&
    environment.equalsIgnoreCase(transaction.to, wrappedTokenAddress);
  const sentWrappedTokenTransfer = valueTransfers?.find(
    ({ contractAddress, from }) =>
      environment.equalsIgnoreCase(from, subjectAddress) &&
      Boolean(wrappedTokenAddress) &&
      environment.equalsIgnoreCase(contractAddress, wrappedTokenAddress),
  );
  const receivedWrappedTokenTransfer = valueTransfers?.find(
    ({ contractAddress, to }) =>
      environment.equalsIgnoreCase(to, subjectAddress) &&
      Boolean(wrappedTokenAddress) &&
      environment.equalsIgnoreCase(contractAddress, wrappedTokenAddress),
  );
  const hasNativeTransferWithoutMethod =
    transactionCategory === 'CONTRACT_CALL' &&
    !transaction.methodId &&
    valueTransfers?.some(({ transferType }) => transferType === 'normal');
  const hasSupplyMethodId =
    transaction.methodId && supplyMethodIds.has(transaction.methodId);

  if (
    isDirectWrappedTokenCall &&
    sentNativeTransfer &&
    receivedWrappedTokenTransfer
  ) {
    return {
      type: 'wrap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentNativeTransfer, 'out'),
        destinationToken: getToken(receivedWrappedTokenTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (
    isDirectWrappedTokenCall &&
    sentWrappedTokenTransfer &&
    receivedNativeTransfer
  ) {
    return {
      type: 'unwrap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentWrappedTokenTransfer, 'out'),
        destinationToken: getToken(receivedNativeTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'SWAP' || transactionCategory === 'EXCHANGE') {
    if (!receivedTransfer?.symbol) {
      return {
        type: 'swapIncomplete',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'apiEvmTransaction', data: transaction },
        data: {
          sourceToken: getToken(sentTransfer, 'out'),
        },
      };
    }

    return {
      type: 'swap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'APPROVE') {
    // TODO: Categorize REVOKE in the backend
    const approveTransfer = sentTransfer ?? receivedTransfer;
    const approveDirection = receivedTransfer && !sentTransfer ? 'in' : 'out';
    const valueTransferContractAddress = valueTransfers?.find(
      ({ contractAddress, transferType }) =>
        contractAddress &&
        transferType !== 'normal' &&
        transferType !== 'internal',
    )?.contractAddress;
    const approveContractAddress =
      (transaction.to &&
      isValidHexAddress(transaction.to, { allowNonPrefixed: false })
        ? transaction.to
        : undefined) ??
      (valueTransferContractAddress &&
      isValidHexAddress(valueTransferContractAddress, {
        allowNonPrefixed: false,
      })
        ? valueTransferContractAddress
        : undefined);
    const fallbackApproveAssetId = approveContractAddress
      ? environment.toAssetId(approveContractAddress, chainId)
      : undefined;
    const approveToken =
      getToken(approveTransfer, approveDirection) ??
      getTokenMetadataFromKnownToken(
        approveContractAddress,
        approveDirection,
        chainId,
        environment,
      ) ??
      (fallbackApproveAssetId
        ? { direction: approveDirection, assetId: fallbackApproveAssetId }
        : undefined);
    const approveAmount = getTokenApprovalAmountFromData(
      getTransactionCalldata(transaction),
      environment,
    );
    const token =
      approveToken && approveAmount
        ? {
            ...approveToken,
            amount: approveAmount,
            ...(isUnlimitedApprovalAmount(approveAmount, approveToken.decimals)
              ? { isUnlimitedApproval: true }
              : {}),
          }
        : approveToken;

    return {
      type: 'approveSpendingCap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        token,
        ...(fees ? { fees } : {}),
      },
    };
  }

  const isNftExchange = transactionCategory === 'NFT_EXCHANGE';

  // TODO: Categorize NFT in the backend, sometimes TRANSFER or CONTRACT_CALL
  if (sentNftTransfer || receivedNftTransfer) {
    if (receivedNftTransfer) {
      if (receivedNftTransfer.from === environment.nativeTokenAddress) {
        return {
          type: 'nftMint',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'apiEvmTransaction', data: transaction },
          data: {
            from: receivedNftTransfer.from,
            to: receivedNftTransfer.to,
            token: getToken(receivedNftTransfer, 'in'),
            ...(fees ? { fees } : {}),
          },
        };
      }

      const purchasePaymentTransfer = getNftPaymentTransfer({
        side: 'buy',
        sentTransfer,
        sentNativeTransfer,
        nftCounterparty: receivedNftTransfer.from,
        subjectAddress,
        environment,
      });

      // API category, or an outgoing payment to the seller / in native value.
      if (isNftExchange || purchasePaymentTransfer) {
        return {
          type: 'nftBuy',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'apiEvmTransaction', data: transaction },
          data: {
            from: receivedNftTransfer.from,
            to: receivedNftTransfer.to,
            token: getToken(receivedNftTransfer, 'in'),
            paymentToken: getToken(purchasePaymentTransfer, 'out'),
            ...(fees ? { fees } : {}),
          },
        };
      }

      return {
        type: 'receive',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'apiEvmTransaction', data: transaction },
        data: {
          from: receivedNftTransfer.from,
          to: receivedNftTransfer.to,
          token: getToken(receivedNftTransfer, 'in'),
        },
      };
    }

    if (sentNftTransfer) {
      const saleProceedsTransfer = getNftPaymentTransfer({
        side: 'sell',
        receivedTransfer,
        nftCounterparty: sentNftTransfer.to,
        transactionFrom: transaction.from,
        subjectAddress,
        environment,
      });

      // API category, or an incoming payment from the buyer.
      if (isNftExchange || saleProceedsTransfer) {
        return {
          type: 'nftSell',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'apiEvmTransaction', data: transaction },
          data: {
            from: sentNftTransfer.from,
            to: sentNftTransfer.to,
            token: getToken(sentNftTransfer, 'out'),
            paymentToken: getToken(saleProceedsTransfer, 'in'),
            ...(fees ? { fees } : {}),
          },
        };
      }

      return {
        type: 'send',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'apiEvmTransaction', data: transaction },
        data: {
          from: sentNftTransfer.from,
          to: sentNftTransfer.to,
          token: getToken(sentNftTransfer, 'out'),
        },
      };
    }
  }

  if (
    transactionCategory === 'TRANSFER' ||
    transactionCategory === 'STANDARD' ||
    hasNativeTransferWithoutMethod
  ) {
    const isReceive =
      Boolean(receivedTransfer && !sentTransfer) ||
      (environment.equalsIgnoreCase(transaction.to, subjectAddress) &&
        !environment.equalsIgnoreCase(transaction.from, subjectAddress));

    const transfer = isReceive ? receivedTransfer : sentTransfer;

    return {
      type: isReceive ? 'receive' : 'send',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        from: transfer?.from ?? transaction.from,
        to: transfer?.to ?? transaction.to,
        token: withFallbackTokenAssetId(
          getToken(transfer, isReceive ? 'in' : 'out'),
          transaction.to,
          transfer?.transferType,
          chainId,
          environment,
        ),
      },
    };
  }

  if (transactionCategory === 'CLAIM_BONUS') {
    return {
      type: 'claimMusdBonus',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        token: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'CLAIM') {
    return {
      type: 'claim',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        token: getToken(
          receivedTransfer ?? sentTransfer,
          receivedTransfer ? 'in' : 'out',
        ),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'WITHDRAW') {
    return {
      type: 'lendingWithdrawal',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'BRIDGE_WITHDRAW') {
    return {
      type: 'bridge',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  // TODO: Categorize Deposit/Stake in the backend
  if (sentTransfer && hasSupplyMethodId) {
    return {
      type: 'lendingDeposit',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  // TODO: Categorize these Swaps in the backend
  if (
    transactionCategory === 'CONTRACT_CALL' &&
    sentTransfer?.symbol &&
    receivedTransfer?.symbol &&
    sentTransfer.symbol !== receivedTransfer.symbol
  ) {
    return {
      type: 'swap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  // TODO: Not sure if this is specific enough, may need separate category in backend
  if (
    transactionCategory === 'DEPOSIT' &&
    receivedTransfer &&
    !hasSupplyMethodId
  ) {
    return {
      type: 'wrap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'UNWRAP') {
    return {
      type: 'unwrap',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        sourceToken: getToken(sentTransfer, 'out'),
        destinationToken: getToken(receivedTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  if (transactionCategory === 'DEPOSIT') {
    return {
      type: 'deposit',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'apiEvmTransaction', data: transaction },
      data: {
        token: getToken(sentTransfer, 'in'),
        ...(fees ? { fees } : {}),
      },
    };
  }

  const contractInteractionTransfer = sentTransfer ?? receivedTransfer;
  const contractInteractionToken = getToken(
    contractInteractionTransfer,
    sentTransfer ? 'out' : 'in',
  );
  const contractInteractionTokenWithAmount = contractInteractionToken?.amount
    ? contractInteractionToken
    : undefined;

  return {
    type: 'contractInteraction',
    chainId,
    status,
    timestamp,
    hash,
    raw: { type: 'apiEvmTransaction', data: transaction },
    data: {
      methodId: transaction.methodId,
      from: transaction.from,
      to: transaction.to,
      transactionCategory,
      transactionProtocol: transaction.transactionProtocol,
      transactionType: transaction.transactionType,
      ...(contractInteractionTokenWithAmount
        ? { token: contractInteractionTokenWithAmount }
        : {}),
      ...(fees ? { fees } : {}),
    },
  };
}
