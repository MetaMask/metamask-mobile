import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import useEarnToasts from './useEarnToasts';
import { MERKL_CLAIM_ORIGIN } from '../components/MerklRewards/constants';
import Logger from '../../../../util/Logger';

/**
 * Hook to monitor Merkl bonus claim transaction status and show appropriate toasts
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated events
 * 2. Filters for Merkl claim transactions (origin === 'merkl-claim')
 * 3. Shows toasts based on transaction status (approved → in-progress, confirmed → success, failed → failed)
 * 4. Tracks shown toasts to prevent duplicates
 * 5. Refreshes token balances when transaction is confirmed/dropped
 *
 * This hook should be mounted globally via EarnTransactionMonitor to ensure
 * toasts are shown even when navigating away from the asset screen.
 */
export const useMerklClaimStatus = () => {
  const { showToast, EarnToastOptions } = useEarnToasts();
  const shownToastsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
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
          // Show in-progress toast immediately after user confirms
          showToast(EarnToastOptions.bonusClaim.inProgress);
          shownToastsRef.current.add(toastKey);
          break;

        case TransactionStatus.confirmed:
        case TransactionStatus.dropped:
          // Show success toast (same as mUSD conversion success per AC)
          showToast(EarnToastOptions.bonusClaim.success);
          shownToastsRef.current.add(toastKey);
          // Refresh token balances so user sees updated balance on home page
          if (chainId) {
            refreshTokenBalances(chainId);
          }
          // Clean up entries for this transaction after final status
          setTimeout(() => {
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.approved}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.confirmed}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.dropped}`,
            );
          }, 5000);
          break;

        case TransactionStatus.failed:
          showToast(EarnToastOptions.bonusClaim.failed);
          shownToastsRef.current.add(toastKey);
          // Clean up entries for this transaction after final status
          setTimeout(() => {
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.approved}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.failed}`,
            );
          }, 5000);
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
    };
  }, [showToast, EarnToastOptions.bonusClaim, refreshTokenBalances]);
};
