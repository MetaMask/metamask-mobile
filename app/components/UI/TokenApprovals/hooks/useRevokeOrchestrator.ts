import { useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { selectApprovals } from '../selectors';
import {
  startRevocationSession,
  updateChainProgress,
  incrementCompleted,
  incrementFailed,
  endRevocationSession,
  clearSelection,
  removeApproval,
} from '../../../../core/redux/slices/tokenApprovals';
import { ApprovalItem, ApprovalAssetType, ChainProgressEntry } from '../types';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import {
  buildRevokeTransactionData,
  getNetworkClientIdForChain,
} from '../utils/revokeTransaction';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { isUserRejection } from '../utils/isUserRejection';
import { CHAIN_DISPLAY_NAMES } from '../constants/chains';
import type { ChainBatchInfo } from './useBatchRevokeSupport';

// Toggle to test UI flow without submitting real transactions
// eslint-disable-next-line no-underscore-dangle
const DRY_RUN = __DEV__ && true;
const DRY_RUN_DELAY_MS = 1500;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTransactionType(approval: ApprovalItem) {
  if (
    approval.asset.type === ApprovalAssetType.ERC721 ||
    approval.asset.type === ApprovalAssetType.ERC1155
  ) {
    return TransactionType.tokenMethodSetApprovalForAll;
  }
  return TransactionType.tokenMethodApprove;
}

export function useRevokeOrchestrator() {
  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const isProcessingRef = useRef(false);

  const revokeSequentialWithProgress = useCallback(
    async (chainId: string, chainApprovals: ApprovalItem[]) => {
      dispatch(
        updateChainProgress({
          chainId,
          update: { status: 'signing', currentIndex: 0 },
        }),
      );

      for (let i = 0; i < chainApprovals.length; i++) {
        const approval = chainApprovals[i];

        dispatch(
          updateChainProgress({
            chainId,
            update: {
              currentIndex: i,
              currentApprovalLabel: `${approval.asset.symbol} revoke`,
            },
          }),
        );

        try {
          if (DRY_RUN) {
            await delay(DRY_RUN_DELAY_MS);
          } else {
            const data = buildRevokeTransactionData(approval);
            const networkClientId = getNetworkClientIdForChain(
              approval.chainId,
            );

            const txParams = {
              to: approval.asset.address as Hex,
              from: address as Hex,
              data: data as Hex,
              value: '0x0' as Hex,
            };

            const result = await addTransaction(txParams, {
              networkClientId,
              origin: 'MetaMask',
              type: getTransactionType(approval),
              requireApproval: false,
            });

            await result.result;
          }

          dispatch(incrementCompleted({ exposureUsd: approval.exposure_usd }));
          if (!DRY_RUN) {
            dispatch(removeApproval(approval.id));
          }
        } catch (err) {
          if (isUserRejection(err)) {
            dispatch(incrementFailed());
            dispatch(
              updateChainProgress({
                chainId,
                update: { status: 'failed', error: 'User rejected' },
              }),
            );
            return;
          }
          dispatch(incrementFailed());
        }
      }

      dispatch(
        updateChainProgress({
          chainId,
          update: { status: 'done', currentIndex: chainApprovals.length },
        }),
      );
    },
    [dispatch, address],
  );

  const revokeBatchWithProgress = useCallback(
    async (chainInfo: ChainBatchInfo) => {
      const networkClientId = getNetworkClientIdForChain(chainInfo.chainId);
      if (!networkClientId || !address) return;

      dispatch(
        updateChainProgress({
          chainId: chainInfo.chainId,
          update: { status: 'signing' },
        }),
      );

      try {
        if (DRY_RUN) {
          await delay(DRY_RUN_DELAY_MS * 2);
        } else {
          const transactions = chainInfo.approvals.map((approval) => ({
            params: {
              to: approval.asset.address as Hex,
              from: address as Hex,
              data: buildRevokeTransactionData(approval) as Hex,
              value: '0x0' as Hex,
            },
            type: getTransactionType(approval),
          }));

          await addTransactionBatch({
            from: address as Hex,
            networkClientId,
            origin: ORIGIN_METAMASK,
            transactions,
            requireApproval: false,
          });
        }

        for (const approval of chainInfo.approvals) {
          dispatch(incrementCompleted({ exposureUsd: approval.exposure_usd }));
          if (!DRY_RUN) {
            dispatch(removeApproval(approval.id));
          }
        }

        dispatch(
          updateChainProgress({
            chainId: chainInfo.chainId,
            update: {
              status: 'done',
              currentIndex: chainInfo.approvals.length,
            },
          }),
        );
      } catch (err) {
        if (isUserRejection(err)) {
          dispatch(
            updateChainProgress({
              chainId: chainInfo.chainId,
              update: { status: 'failed', error: 'User rejected' },
            }),
          );
        } else {
          dispatch(
            updateChainProgress({
              chainId: chainInfo.chainId,
              update: {
                status: 'failed',
                error:
                  err instanceof Error
                    ? err.message
                    : 'Batch transaction failed',
              },
            }),
          );
        }
        chainInfo.approvals.forEach(() => {
          dispatch(incrementFailed());
        });
      }
    },
    [address, dispatch],
  );

  const startRevocation = useCallback(
    async (approvalIds: string[], chainBreakdown?: ChainBatchInfo[]) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const approvalsToRevoke = approvals.filter((a) =>
          approvalIds.includes(a.id),
        );

        const totalExposureUsd = approvalsToRevoke.reduce(
          (sum, a) => sum + a.exposure_usd,
          0,
        );

        // Build chain progress entries
        const byChain = new Map<string, ApprovalItem[]>();
        for (const approval of approvalsToRevoke) {
          const existing = byChain.get(approval.chainId) ?? [];
          existing.push(approval);
          byChain.set(approval.chainId, existing);
        }

        const chainProgress: ChainProgressEntry[] = Array.from(
          byChain.entries(),
        ).map(([chainId, chainApprovals]) => {
          const chainInfo = chainBreakdown?.find((c) => c.chainId === chainId);
          const isBatch = chainInfo?.supportsBatch ?? false;
          return {
            chainId,
            chainName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
            isBatch,
            totalApprovals: chainApprovals.length,
            currentIndex: 0,
            status: 'waiting' as const,
          };
        });

        dispatch(
          startRevocationSession({
            totalApprovals: approvalsToRevoke.length,
            totalExposureUsd,
            chainProgress,
          }),
        );

        // Process chains in parallel
        if (chainBreakdown) {
          const promises = chainBreakdown.map(async (chainInfo) => {
            if (chainInfo.supportsBatch) {
              await revokeBatchWithProgress(chainInfo);
            } else {
              await revokeSequentialWithProgress(
                chainInfo.chainId,
                chainInfo.approvals,
              );
            }
          });
          await Promise.allSettled(promises);
        } else {
          const chainPromises = Array.from(byChain.entries()).map(
            ([chainId, chainApprovals]) =>
              revokeSequentialWithProgress(chainId, chainApprovals),
          );
          await Promise.allSettled(chainPromises);
        }

        dispatch(endRevocationSession());
        dispatch(clearSelection());
      } finally {
        isProcessingRef.current = false;
      }
    },
    [
      approvals,
      revokeBatchWithProgress,
      revokeSequentialWithProgress,
      dispatch,
    ],
  );

  return { startRevocation };
}
