import { useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectApprovals } from '../selectors';
import { clearSelection } from '../../../../core/redux/slices/tokenApprovals';
import { ApprovalItem, Verdict } from '../types';
import { useRevokeApproval } from './useRevokeApproval';

export function useBatchRevoke() {
  const dispatch = useDispatch();
  const approvals = useSelector(selectApprovals);
  const { revokeApproval } = useRevokeApproval();
  const isProcessingRef = useRef(false);

  const batchRevoke = useCallback(
    async (approvalIds: string[]) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const approvalsToRevoke = approvals.filter((a) =>
          approvalIds.includes(a.id),
        );

        // Group by chain for sequential processing within each chain
        const byChain = new Map<string, ApprovalItem[]>();
        for (const approval of approvalsToRevoke) {
          const existing = byChain.get(approval.chainId) ?? [];
          existing.push(approval);
          byChain.set(approval.chainId, existing);
        }

        // Process different chains in parallel, same chain sequentially
        const chainPromises = Array.from(byChain.values()).map(
          async (chainApprovals) => {
            for (const approval of chainApprovals) {
              await revokeApproval(approval);
            }
          },
        );

        await Promise.allSettled(chainPromises);
        dispatch(clearSelection());
      } finally {
        isProcessingRef.current = false;
      }
    },
    [approvals, revokeApproval, dispatch],
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
