import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { BN } from 'ethereumjs-util';
import { ApprovalItem } from '../types';
import { ChainBatchInfo } from './useBatchRevokeSupport';
import {
  buildRevokeTransactionData,
  getNetworkClientIdForChain,
} from '../utils/revokeTransaction';
import { getGasLimit } from '../../../../util/custom-gas';
import { selectConversionRateByChainId } from '../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { getMediumGasPriceHex } from '../../../../util/confirmation/gas';
import { weiToFiatNumber } from '../../../../util/number';
import { CHAIN_DISPLAY_NAMES } from '../constants/chains';
import { store } from '../../../../store';

interface ChainGasEstimate {
  chainId: string;
  chainName: string;
  gasUsd: number;
  txCount: number;
  isLoading: boolean;
}

interface GasEstimationResult {
  chainEstimates: ChainGasEstimate[];
  totalGasUsd: number;
  totalTxCount: number;
  signingSteps: number;
  isLoading: boolean;
}

export function useGasEstimation(
  approvalItems: ApprovalItem[],
  chainBreakdown?: ChainBatchInfo[],
): GasEstimationResult {
  const [chainEstimates, setChainEstimates] = useState<ChainGasEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const hasEstimatedRef = useRef<string | null>(null);

  // Stable key for the current set of approvals
  const approvalKey = approvalItems
    .map((a) => a.id)
    .sort()
    .join(',');

  useEffect(() => {
    if (approvalItems.length === 0 || !address) {
      setChainEstimates([]);
      return;
    }

    // Skip if we already estimated for this exact set
    if (hasEstimatedRef.current === approvalKey) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);

      // Group approvals by chain
      const byChain = new Map<string, ApprovalItem[]>();
      for (const approval of approvalItems) {
        const existing = byChain.get(approval.chainId) ?? [];
        existing.push(approval);
        byChain.set(approval.chainId, existing);
      }

      const estimates: ChainGasEstimate[] = [];

      // Process all chains in parallel
      const chainEntries = Array.from(byChain.entries());
      const chainResults = await Promise.allSettled(
        chainEntries.map(async ([chainId, chainApprovals]) => {
          const chainInfo = chainBreakdown?.find((c) => c.chainId === chainId);
          const isBatch = chainInfo?.supportsBatch ?? false;
          const chainName = CHAIN_DISPLAY_NAMES[chainId] ?? chainId;

          try {
            const sampleApproval = chainApprovals[0];
            const data = buildRevokeTransactionData(sampleApproval);
            const networkClientId = getNetworkClientIdForChain(
              sampleApproval.chainId,
            );

            const txParams = {
              to: sampleApproval.asset.address as Hex,
              from: address as Hex,
              data: data as Hex,
              value: '0x0' as Hex,
            };

            // Use getGasLimit which wraps estimateGas with a safe fallback
            const gasEstimation = await getGasLimit(
              txParams,
              false,
              networkClientId,
            );

            if (cancelled) return null;

            // gasEstimation.gas is a BN instance
            const gasLimitBN = gasEstimation.gas;

            // Read current state snapshot for gas price and conversion rate
            const currentState = store.getState();

            // Get the medium gas price from GasFeeController cached estimates
            const gasFeeEstimates =
              currentState.engine?.backgroundState?.GasFeeController
                ?.gasFeeEstimatesByChainId?.[chainId]?.gasFeeEstimates;
            const mediumGasPriceHex = getMediumGasPriceHex(
              gasFeeEstimates as Parameters<typeof getMediumGasPriceHex>[0],
            );

            // Calculate gas cost in wei: gasLimit * gasPrice
            const gasPriceBN = new BN(mediumGasPriceHex.replace('0x', ''), 16);
            const gasCostWei = gasLimitBN.mul(gasPriceBN);

            // Convert wei to fiat using the chain's native-to-fiat conversion rate
            const conversionRate = selectConversionRateByChainId(
              currentState,
              chainId,
            );
            const singleGasUsd =
              conversionRate && typeof conversionRate === 'number'
                ? weiToFiatNumber(gasCostWei, conversionRate)
                : 0;

            const txCount = isBatch ? 1 : chainApprovals.length;
            const totalGasUsd = isBatch
              ? singleGasUsd * chainApprovals.length * 0.9
              : singleGasUsd * chainApprovals.length;

            return {
              chainId,
              chainName,
              gasUsd: totalGasUsd,
              txCount,
              isLoading: false,
            } as ChainGasEstimate;
          } catch {
            return {
              chainId,
              chainName,
              gasUsd: 0,
              txCount: isBatch ? 1 : chainApprovals.length,
              isLoading: false,
            } as ChainGasEstimate;
          }
        }),
      );

      if (cancelled) return;

      for (const result of chainResults) {
        if (result.status === 'fulfilled' && result.value) {
          estimates.push(result.value);
        }
      }

      hasEstimatedRef.current = approvalKey;
      setChainEstimates(estimates);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalKey, address]);

  const totalGasUsd = chainEstimates.reduce((sum, e) => sum + e.gasUsd, 0);
  const totalTxCount = chainEstimates.reduce((sum, e) => sum + e.txCount, 0);

  const signingSteps = chainBreakdown
    ? chainBreakdown.reduce(
        (sum, c) => sum + (c.supportsBatch ? 1 : c.approvals.length),
        0,
      )
    : totalTxCount;

  return {
    chainEstimates,
    totalGasUsd,
    totalTxCount,
    signingSteps,
    isLoading,
  };
}
