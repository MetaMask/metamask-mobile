import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { ApprovalItem } from '../types';
import type { ChainBatchInfo } from './useBatchRevokeSupport';
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
import Engine from '../../../../core/Engine';
import { getChainTransactionCount } from '../utils/revocationProgress';

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

  const chainPlans = useMemo(() => {
    const byChain = new Map<string, ApprovalItem[]>();

    for (const approval of approvalItems) {
      const existing = byChain.get(approval.chainId) ?? [];
      existing.push(approval);
      byChain.set(approval.chainId, existing);
    }

    return Array.from(byChain.entries()).map(([chainId, approvals]) => {
      const chainInfo = chainBreakdown?.find(
        (chain) => chain.chainId === chainId,
      );
      const supportsBatch = chainInfo?.supportsBatch ?? false;

      return {
        chainId,
        chainName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
        approvals,
        supportsBatch,
        txCount: getChainTransactionCount({
          isBatch: supportsBatch,
          totalApprovals: approvals.length,
        }),
      };
    });
  }, [approvalItems, chainBreakdown]);

  useEffect(() => {
    if (chainPlans.length === 0 || !address) {
      setChainEstimates([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setChainEstimates([]);
      setIsLoading(true);

      const estimates: ChainGasEstimate[] = [];

      const chainResults = await Promise.allSettled(
        chainPlans.map(async (plan) => {
          try {
            const sampleApproval = plan.approvals[0];
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

            // Read current state snapshot for conversion rate
            const currentState = store.getState();

            // Actively fetch gas fee estimates for this chain (not just read cache)
            const { GasFeeController } = Engine.context;
            const { gasFeeEstimates } =
              await GasFeeController.fetchGasFeeEstimates({
                networkClientId,
              });

            if (cancelled) return null;

            const mediumGasPriceHex = getMediumGasPriceHex(
              gasFeeEstimates as Parameters<typeof getMediumGasPriceHex>[0],
            );

            // Calculate gas cost in wei: gasLimit * gasPrice
            const gasCostWei =
              BigInt(gasLimitBN.toString()) * BigInt(mediumGasPriceHex);

            // Convert wei to fiat using the chain's native-to-fiat conversion rate
            const conversionRate = selectConversionRateByChainId(
              currentState,
              plan.chainId,
            );
            const singleGasUsd =
              conversionRate && typeof conversionRate === 'number'
                ? weiToFiatNumber(gasCostWei.toString(), conversionRate)
                : 0;

            const totalGasUsd = plan.supportsBatch
              ? singleGasUsd * plan.approvals.length * 0.9
              : singleGasUsd * plan.approvals.length;

            return {
              chainId: plan.chainId,
              chainName: plan.chainName,
              gasUsd: totalGasUsd,
              txCount: plan.txCount,
              isLoading: false,
            } as ChainGasEstimate;
          } catch {
            return {
              chainId: plan.chainId,
              chainName: plan.chainName,
              gasUsd: 0,
              txCount: plan.txCount,
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

      setChainEstimates(estimates);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [address, chainPlans]);

  const totalGasUsd = chainEstimates.reduce((sum, e) => sum + e.gasUsd, 0);
  const totalTxCount = chainPlans.reduce((sum, plan) => sum + plan.txCount, 0);
  const signingSteps = totalTxCount;

  return {
    chainEstimates,
    totalGasUsd,
    totalTxCount,
    signingSteps,
    isLoading,
  };
}
