import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { isAtomicBatchSupported } from '../../../../util/transaction-controller';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectApprovals } from '../selectors';
import { ApprovalItem } from '../types';
import { CHAIN_DISPLAY_NAMES } from '../constants/chains';

export interface ChainBatchInfo {
  chainId: string;
  chainName: string;
  approvals: ApprovalItem[];
  supportsBatch: boolean;
  isUpgraded: boolean;
  canUpgrade: boolean;
  upgradeContractAddress?: string;
}

export interface BatchRevokeSupport {
  chainBreakdown: ChainBatchInfo[];
  hasBatchableChains: boolean;
  hasUpgradeRequired: boolean;
  isLoading: boolean;
}

export function useBatchRevokeSupport(
  approvalIds: string[],
): BatchRevokeSupport {
  const allApprovals = useSelector(selectApprovals);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const [batchSupportMap, setBatchSupportMap] = useState<
    Map<
      string,
      {
        isSupported: boolean;
        delegationAddress?: string;
        upgradeContractAddress?: string;
      }
    >
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const selectedApprovals = useMemo(
    () => allApprovals.filter((a) => approvalIds.includes(a.id)),
    [allApprovals, approvalIds],
  );

  const chainIds = useMemo(
    () => [...new Set(selectedApprovals.map((a) => a.chainId))],
    [selectedApprovals],
  );

  useEffect(() => {
    if (!address || chainIds.length === 0) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const result = await isAtomicBatchSupported({
          address: address as Hex,
          chainIds: chainIds as Hex[],
        });

        if (cancelled) return;

        const map = new Map<
          string,
          {
            isSupported: boolean;
            delegationAddress?: string;
            upgradeContractAddress?: string;
          }
        >();
        for (const entry of result) {
          map.set(entry.chainId.toLowerCase(), {
            isSupported: entry.isSupported,
            delegationAddress: entry.delegationAddress,
            upgradeContractAddress: entry.upgradeContractAddress,
          });
        }
        setBatchSupportMap(map);
      } catch {
        // If the check fails, assume no batch support
        setBatchSupportMap(new Map());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, chainIds]);

  const chainBreakdown = useMemo((): ChainBatchInfo[] => {
    const byChain = new Map<string, ApprovalItem[]>();
    for (const approval of selectedApprovals) {
      const existing = byChain.get(approval.chainId) ?? [];
      existing.push(approval);
      byChain.set(approval.chainId, existing);
    }

    return Array.from(byChain.entries()).map(([chainId, approvals]) => {
      const support = batchSupportMap.get(chainId.toLowerCase());
      const isSupported = support?.isSupported ?? false;
      const isUpgraded = isSupported && !!support?.delegationAddress;
      const canUpgrade = isSupported && !support?.delegationAddress;

      return {
        chainId,
        chainName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
        approvals,
        supportsBatch: isSupported && approvals.length >= 2,
        isUpgraded,
        canUpgrade,
        upgradeContractAddress: support?.upgradeContractAddress,
      };
    });
  }, [selectedApprovals, batchSupportMap]);

  const hasBatchableChains = chainBreakdown.some((c) => c.supportsBatch);
  const hasUpgradeRequired = chainBreakdown.some(
    (c) => c.supportsBatch && c.canUpgrade,
  );

  return {
    chainBreakdown,
    hasBatchableChains,
    hasUpgradeRequired,
    isLoading,
  };
}
