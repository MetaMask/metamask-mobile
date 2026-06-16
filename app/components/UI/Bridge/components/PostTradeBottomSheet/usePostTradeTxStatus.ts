import { useSelector } from 'react-redux';
import {
  formatChainIdToCaip,
  isSolanaChainId,
  StatusTypes,
} from '@metamask/bridge-controller';
import {
  TransactionStatus as KeyringTransactionStatus,
  type Transaction,
} from '@metamask/keyring-api';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { RootState } from '../../../../../reducers';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import { selectMultichainTransactions } from '../../../../../selectors/multichain/multichain';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { findBridgeHistoryItem } from '../../../../../util/bridge/findBridgeHistoryItem';
import { PostTradeStatus } from './PostTradeBottomSheet.types';

interface UsePostTradeTxStatusParams {
  initialStatus: PostTradeStatus;
  isBridge: boolean;
  transactionMetaId?: string;
  transactionHash?: string;
}

const normalizeHash = (hash?: string) => hash || undefined;

const getMultichainPostTradeStatus = (
  state: RootState,
  transactionHash?: string,
  chainId?: number,
): PostTradeStatus | undefined => {
  if (!transactionHash || !chainId) {
    return undefined;
  }

  const nonEvmTransactions = selectMultichainTransactions(state);
  const sourceScope = formatChainIdToCaip(chainId);
  const sourceChainTransactions = Object.values(nonEvmTransactions).flatMap(
    (accountTransactions) =>
      accountTransactions[sourceScope]?.transactions ?? [],
  );
  const transaction = sourceChainTransactions.find(
    (tx: Transaction) => tx.id === transactionHash,
  );

  if (transaction?.status === KeyringTransactionStatus.Confirmed) {
    return PostTradeStatus.Success;
  }
  if (transaction?.status === KeyringTransactionStatus.Failed) {
    return PostTradeStatus.Failed;
  }

  return undefined;
};

export const usePostTradeTxStatus = ({
  initialStatus,
  isBridge,
  transactionMetaId,
  transactionHash,
}: UsePostTradeTxStatusParams): PostTradeStatus => {
  const transactionMeta = useSelector((state: RootState) =>
    transactionMetaId
      ? selectTransactionMetadataById(state, transactionMetaId)
      : undefined,
  ) as TransactionMeta | undefined;
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const submittedTransactionHash =
    normalizeHash(transactionMeta?.hash) ?? normalizeHash(transactionHash);

  const bridgeHistoryItem = findBridgeHistoryItem({
    bridgeHistory,
    transactionMetaId,
    transactionActionId: transactionMeta?.actionId,
    transactionHash: submittedTransactionHash,
  });

  const quote = bridgeHistoryItem?.quote;
  const sourceTransactionHash =
    submittedTransactionHash ??
    normalizeHash(bridgeHistoryItem?.status?.srcChain?.txHash) ??
    normalizeHash(transactionMetaId);
  // Same-chain Solana swaps never terminalize in `BridgeStatusController`, so
  // resolve them from `MultichainTransactionsController` instead
  const shouldResolveFromMultichain = Boolean(
    !isBridge && quote && isSolanaChainId(quote.srcChainId),
  );
  const multichainStatus = useSelector((state: RootState) =>
    getMultichainPostTradeStatus(
      state,
      shouldResolveFromMultichain ? sourceTransactionHash : undefined,
      quote?.srcChainId,
    ),
  );

  if (initialStatus === PostTradeStatus.Failed) {
    return PostTradeStatus.Failed;
  }

  const transactionStatus = transactionMeta?.status;
  if (
    transactionStatus === TransactionStatus.failed ||
    transactionStatus === TransactionStatus.dropped ||
    transactionStatus === TransactionStatus.rejected ||
    transactionStatus === TransactionStatus.cancelled
  ) {
    return PostTradeStatus.Failed;
  }

  const bridgeStatus = bridgeHistoryItem?.status?.status;
  if (bridgeStatus === StatusTypes.FAILED) {
    return PostTradeStatus.Failed;
  }

  if (bridgeStatus === StatusTypes.COMPLETE) {
    return PostTradeStatus.Success;
  }

  if (multichainStatus) {
    return multichainStatus;
  }

  if (!isBridge && transactionStatus === TransactionStatus.confirmed) {
    return PostTradeStatus.Success;
  }

  return PostTradeStatus.InProgress;
};
