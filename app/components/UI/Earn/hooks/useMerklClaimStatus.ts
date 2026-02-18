import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import useEarnToasts from './useEarnToasts';
import { MERKL_CLAIM_ORIGIN } from '../components/MerklRewards/constants';
import { clearMerklRewardsCache } from '../components/MerklRewards/merkl-client';
import Logger from '../../../../util/Logger';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { calcTokenAmount } from '../../../../util/transactions';
import { MUSD_DECIMALS } from '../constants/musd';
import { getUnclaimedAmountForMerklClaimTx } from '../utils/musd';
import { getNetworkName } from '../utils/network';

/**
 * Hook to monitor Merkl bonus claim transaction status and show appropriate toasts
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated events
 * 2. Filters for Merkl claim transactions (origin === 'merkl-claim')
 * 3. Shows toasts based on transaction status (approved → in-progress, confirmed → success, failed/dropped → failed)
 * 4. Tracks shown toasts to prevent duplicates
 * 5. Refreshes token balances when transaction is confirmed
 *
 * This hook should be mounted globally via EarnTransactionMonitor to ensure
 * toasts are shown even when navigating away from the asset screen.
 */
export const useMerklClaimStatus = () => {
  const { showToast, EarnToastOptions } = useEarnToasts();
  const shownToastsRef = useRef<Set<string>>(new Set());
  const claimAmountByTransactionIdRef = useRef<Map<string, string>>(new Map());
  const pendingTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(
    new Set(),
  );

  const { trackEvent, createEventBuilder } = useAnalytics();

  // Refresh token balances for the given chainId
  const refreshTokenBalances = useCallback(async (chainId: Hex) => {
    try {
      const {
        TokenBalancesController,
        TokenDetectionController,
        AccountTrackerController,
        NetworkController,
      } = Engine.context;

      // Get networkClientId for the chain
      const networkConfig =
        NetworkController?.state?.networkConfigurationsByChainId?.[chainId];
      const networkClientId =
        networkConfig?.rpcEndpoints?.[networkConfig?.defaultRpcEndpointIndex]
          ?.networkClientId;

      // Refresh token balances, detection, and account balances in parallel
      await Promise.all([
        TokenBalancesController?.updateBalances({
          chainIds: [chainId],
        }),
        TokenDetectionController?.detectTokens({
          chainIds: [chainId],
        }),
        networkClientId
          ? AccountTrackerController?.refresh([networkClientId])
          : Promise.resolve(),
      ]);
    } catch (error) {
      Logger.error(
        error as Error,
        'useMerklClaimStatus: Failed to refresh token balances',
      );
    }
  }, []);

  const submitClaimBonusStatusUpdatedEvent = useCallback(
    async (transactionMeta: TransactionMeta) => {
      try {
        const { id: transactionId, status } = transactionMeta;
        const baseProperties: Record<string, unknown> = {
          transaction_id: transactionId,
          transaction_status: status,
          transaction_type: transactionMeta.type,
          network_chain_id: transactionMeta?.chainId,
          network_name: getNetworkName(transactionMeta?.chainId),
        };

        const cachedClaimAmountRaw =
          claimAmountByTransactionIdRef.current.get(transactionId);

        if (
          (status === TransactionStatus.confirmed ||
            status === TransactionStatus.failed ||
            status === TransactionStatus.dropped) &&
          cachedClaimAmountRaw
        ) {
          baseProperties.amount_claimed_decimal = calcTokenAmount(
            cachedClaimAmountRaw,
            MUSD_DECIMALS,
          ).toString();
        } else {
          const claimAmountResult = await getUnclaimedAmountForMerklClaimTx(
            transactionMeta.txParams?.data as string | undefined,
            transactionMeta.chainId as Hex,
          );

          if (claimAmountResult?.contractCallSucceeded) {
            baseProperties.amount_claimed_decimal = calcTokenAmount(
              claimAmountResult.unclaimedRaw,
              MUSD_DECIMALS,
            ).toString();

            if (status === TransactionStatus.approved) {
              claimAmountByTransactionIdRef.current.set(
                transactionId,
                claimAmountResult.unclaimedRaw,
              );
            }
          } else {
            Logger.error(
              claimAmountResult?.error as Error,
              'useMerklClaimStatus: Failed to get Merkl claim contract data. Submitting event with partial data.',
            );
          }
        }

        trackEvent(
          createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_STATUS_UPDATED)
            .addProperties(baseProperties)
            .build(),
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'useMerklClaimStatus: Failed to submit claim bonus status event',
        );
      }
    },
    [trackEvent, createEventBuilder],
  );

  useEffect(() => {
    // Capture ref for cleanup to satisfy eslint react-hooks/exhaustive-deps
    const pendingTimeouts = pendingTimeoutsRef.current;

    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      // Filter for Merkl claim transactions by origin
      if (transactionMeta.origin !== MERKL_CLAIM_ORIGIN) {
        return;
      }

      const { id: transactionId, status, chainId } = transactionMeta;
      const toastKey = `${transactionId}-${status}`;

      // Prevent duplicate toasts for the same transaction status
      if (shownToastsRef.current.has(toastKey)) {
        return;
      }

      switch (status) {
        case TransactionStatus.approved:
          submitClaimBonusStatusUpdatedEvent(transactionMeta);
          // Show in-progress toast immediately after user confirms
          showToast(EarnToastOptions.bonusClaim.inProgress);
          shownToastsRef.current.add(toastKey);
          break;

        case TransactionStatus.confirmed:
          submitClaimBonusStatusUpdatedEvent(transactionMeta);
          // Show success toast (same as mUSD conversion success per AC)
          showToast(EarnToastOptions.bonusClaim.success);
          shownToastsRef.current.add(toastKey);
          // Invalidate cached Merkl rewards so the next fetch reflects the new on-chain state
          clearMerklRewardsCache();
          // Refresh token balances so user sees updated balance on home page
          if (chainId) {
            refreshTokenBalances(chainId);
          }
          // Clean up entries for this transaction after final status
          {
            const timeoutId = setTimeout(() => {
              shownToastsRef.current.delete(
                `${transactionId}-${TransactionStatus.approved}`,
              );
              shownToastsRef.current.delete(
                `${transactionId}-${TransactionStatus.confirmed}`,
              );
              claimAmountByTransactionIdRef.current.delete(transactionId);
              pendingTimeouts.delete(timeoutId);
            }, 5000);
            pendingTimeouts.add(timeoutId);
          }
          break;

        case TransactionStatus.failed:
        case TransactionStatus.dropped:
          submitClaimBonusStatusUpdatedEvent(transactionMeta);
          // Dropped = transaction replaced, timed out, or removed from mempool (not confirmed)
          showToast(EarnToastOptions.bonusClaim.failed);
          shownToastsRef.current.add(toastKey);
          // Clean up entries for this transaction after final status
          {
            const timeoutId = setTimeout(() => {
              shownToastsRef.current.delete(
                `${transactionId}-${TransactionStatus.approved}`,
              );
              shownToastsRef.current.delete(
                `${transactionId}-${TransactionStatus.failed}`,
              );
              shownToastsRef.current.delete(
                `${transactionId}-${TransactionStatus.dropped}`,
              );
              claimAmountByTransactionIdRef.current.delete(transactionId);
              pendingTimeouts.delete(timeoutId);
            }, 5000);
            pendingTimeouts.add(timeoutId);
          }
          break;

        default:
          break;
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      // Clear all pending timeouts to prevent memory leaks
      pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTimeouts.clear();
    };
  }, [
    showToast,
    EarnToastOptions.bonusClaim,
    refreshTokenBalances,
    submitClaimBonusStatusUpdatedEvent,
  ]);
};
