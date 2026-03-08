import type { ChainProgressEntry } from '../types';

export function getChainTransactionCount({
  isBatch,
  totalApprovals,
}: {
  isBatch: boolean;
  totalApprovals: number;
}) {
  return isBatch ? 1 : totalApprovals;
}

function getProcessedTransactionsForChain(
  progress: ChainProgressEntry,
): number {
  if (progress.isBatch) {
    return progress.status === 'done' || progress.status === 'failed'
      ? progress.totalTransactions
      : 0;
  }

  switch (progress.status) {
    case 'done':
      return progress.totalTransactions;
    case 'failed':
      return Math.min(progress.currentIndex + 1, progress.totalTransactions);
    case 'signing':
      return Math.min(progress.currentIndex, progress.totalTransactions);
    default:
      return 0;
  }
}

export function getTotalTransactionCount(chainProgress: ChainProgressEntry[]) {
  return chainProgress.reduce(
    (sum, progress) => sum + progress.totalTransactions,
    0,
  );
}

export function getCurrentProcessingTransactionIndex(
  chainProgress: ChainProgressEntry[],
) {
  const totalTransactions = getTotalTransactionCount(chainProgress);

  if (!totalTransactions) {
    return 0;
  }

  const processedTransactions = chainProgress.reduce(
    (sum, progress) => sum + getProcessedTransactionsForChain(progress),
    0,
  );
  const hasInFlightTransaction = chainProgress.some(
    (progress) => progress.status === 'signing',
  );

  return Math.min(
    totalTransactions,
    processedTransactions + (hasInFlightTransaction ? 1 : 0),
  );
}
