import { useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import { selectApprovals } from '../selectors';
import {
  clearSelection,
  setRevocationStatus,
  removeApproval,
} from '../../../../core/redux/slices/tokenApprovals';
import { ApprovalItem, ApprovalAssetType, Verdict } from '../types';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
import {
  buildRevokeTransactionData,
  getNetworkClientIdForChain,
} from '../utils/revokeTransaction';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import Routes from '../../../../constants/navigation/Routes';
import type { ChainBatchInfo } from './useBatchRevokeSupport';

function getTransactionType(approval: ApprovalItem) {
  if (
    approval.asset.type === ApprovalAssetType.ERC721 ||
    approval.asset.type === ApprovalAssetType.ERC1155
  ) {
    return TransactionType.tokenMethodSetApprovalForAll;
  }
  return TransactionType.tokenMethodApprove;
}

export function useBatchRevoke() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const approvals = useSelector(selectApprovals);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const isProcessingRef = useRef(false);

  const revokeSequential = useCallback(
    async (chainApprovals: ApprovalItem[]) => {
      for (const approval of chainApprovals) {
        dispatch(
          setRevocationStatus({
            id: approval.id,
            status: { status: 'pending' },
          }),
        );

        try {
          const data = buildRevokeTransactionData(approval);
          const networkClientId = getNetworkClientIdForChain(approval.chainId);

          const txParams = {
            to: approval.asset.address as `0x${string}`,
            from: address as `0x${string}`,
            data: data as `0x${string}`,
            value: '0x0' as `0x${string}`,
          };

          const result = await addTransaction(txParams, {
            networkClientId,
            origin: 'MetaMask',
            type: getTransactionType(approval),
          });

          dispatch(
            setRevocationStatus({
              id: approval.id,
              status: {
                status: 'submitted',
                transactionHash: result.transactionMeta.hash,
              },
            }),
          );

          await result.result;

          dispatch(
            setRevocationStatus({
              id: approval.id,
              status: { status: 'confirmed' },
            }),
          );

          setTimeout(() => {
            dispatch(removeApproval(approval.id));
          }, 2000);
        } catch (err) {
          dispatch(
            setRevocationStatus({
              id: approval.id,
              status: {
                status: 'failed',
                error:
                  err instanceof Error ? err.message : 'Transaction failed',
              },
            }),
          );
        }
      }
    },
    [dispatch, address],
  );

  const revokeBatch = useCallback(
    async (chainInfo: ChainBatchInfo) => {
      const networkClientId = getNetworkClientIdForChain(chainInfo.chainId);
      if (!networkClientId || !address) return;

      // Mark all approvals in this batch as pending
      for (const approval of chainInfo.approvals) {
        dispatch(
          setRevocationStatus({
            id: approval.id,
            status: { status: 'pending' },
          }),
        );
      }

      try {
        const transactions = chainInfo.approvals.map((approval) => ({
          params: {
            to: approval.asset.address as Hex,
            from: address as Hex,
            data: buildRevokeTransactionData(approval) as Hex,
            value: '0x0' as Hex,
          },
          type: getTransactionType(approval),
        }));

        addTransactionBatch({
          from: address as Hex,
          networkClientId,
          origin: ORIGIN_METAMASK,
          transactions,
          requireApproval: true,
        });

        // Navigate to the standard confirmation UI for the batch
        navigation.navigate(
          Routes.TOKEN_APPROVALS.ROOT as never,
          {
            screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          } as never,
        );
      } catch (err) {
        for (const approval of chainInfo.approvals) {
          dispatch(
            setRevocationStatus({
              id: approval.id,
              status: {
                status: 'failed',
                error:
                  err instanceof Error
                    ? err.message
                    : 'Batch transaction failed',
              },
            }),
          );
        }
      }
    },
    [address, dispatch, navigation],
  );

  const batchRevoke = useCallback(
    async (approvalIds: string[], chainBreakdown?: ChainBatchInfo[]) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const approvalsToRevoke = approvals.filter((a) =>
          approvalIds.includes(a.id),
        );

        // If we have chain breakdown with batch support info, use smart routing
        if (chainBreakdown) {
          const promises = chainBreakdown.map(async (chainInfo) => {
            if (chainInfo.supportsBatch) {
              await revokeBatch(chainInfo);
            } else {
              await revokeSequential(chainInfo.approvals);
            }
          });

          await Promise.allSettled(promises);
        } else {
          // Fallback: group by chain and process sequentially (no batch info available)
          const byChain = new Map<string, ApprovalItem[]>();
          for (const approval of approvalsToRevoke) {
            const existing = byChain.get(approval.chainId) ?? [];
            existing.push(approval);
            byChain.set(approval.chainId, existing);
          }

          const chainPromises = Array.from(byChain.values()).map(
            (chainApprovals) => revokeSequential(chainApprovals),
          );

          await Promise.allSettled(chainPromises);
        }

        dispatch(clearSelection());
      } finally {
        isProcessingRef.current = false;
      }
    },
    [approvals, revokeBatch, revokeSequential, dispatch],
  );

  const revokeAllMalicious = useCallback(async () => {
    const maliciousIds = approvals
      .filter((a) => a.verdict === Verdict.Malicious)
      .map((a) => a.id);
    if (maliciousIds.length > 0) {
      await batchRevoke(maliciousIds);
    }
  }, [approvals, batchRevoke]);

  return { batchRevoke, revokeAllMalicious };
}
