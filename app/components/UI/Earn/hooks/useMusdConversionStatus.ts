import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectERC20TokensByChain } from '../../../../selectors/tokenListController';
import { safeToChecksumAddress } from '../../../../util/address';
import { getAssetImageUrl } from '../../Bridge/hooks/useAssetMetadata/utils';
import useEarnToasts from './useEarnToasts';

const DEFAULT_ESTIMATED_TIME_SECONDS = 15;

/**
 * Hook to monitor mUSD conversion transaction status and show appropriate toasts
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated events
 * 2. Filters for mUSD conversion transactions (type === 'musdConversion')
 * 3. Shows toasts based on transaction status:
 * - approved → in-progress toast with token icon and ETA (fires immediately after confirm)
 * - confirmed → success toast
 * - failed → failed toast
 * 4. Tracks shown toasts to prevent duplicates
 *
 * This hook should be mounted globally to ensure toasts are shown even when
 * navigating away from the conversion screen.
 */
export const useMusdConversionStatus = () => {
  const { showToast, EarnToastOptions } = useEarnToasts();
  const tokensChainsCache = useSelector(selectERC20TokensByChain);

  const shownToastsRef = useRef<Set<string>>(new Set());
  const tokensCacheRef = useRef(tokensChainsCache);
  tokensCacheRef.current = tokensChainsCache;

  useEffect(() => {
    const getTokenSymbol = (chainId: Hex, tokenAddress: string): string => {
      const chainTokens = tokensCacheRef.current?.[chainId]?.data;
      if (!chainTokens) return '';

      const checksumAddress = safeToChecksumAddress(tokenAddress);
      return (
        chainTokens[checksumAddress as string]?.symbol ||
        chainTokens[tokenAddress.toLowerCase()]?.symbol ||
        ''
      );
    };

    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type !== TransactionType.musdConversion) {
        return;
      }

      const { id: transactionId, status, metamaskPay } = transactionMeta;
      const { chainId: payChainId, tokenAddress: payTokenAddress } =
        metamaskPay || {};

      const toastKey = `${transactionId}-${status}`;

      if (shownToastsRef.current.has(toastKey)) {
        return;
      }

      switch (status) {
        case TransactionStatus.approved: {
          // Get token info for the in-progress toast
          // Using 'approved' status to show toast immediately after user confirms
          const tokenSymbol = payTokenAddress
            ? getTokenSymbol(payChainId as Hex, payTokenAddress)
            : '';
          const tokenIcon = payTokenAddress
            ? getAssetImageUrl(payTokenAddress, payChainId as Hex)
            : undefined;

          showToast(
            EarnToastOptions.mUsdConversion.inProgress({
              tokenSymbol: tokenSymbol || 'Token',
              tokenIcon,
              estimatedTimeSeconds: DEFAULT_ESTIMATED_TIME_SECONDS,
            }),
          );
          shownToastsRef.current.add(toastKey);
          break;
        }
        case TransactionStatus.confirmed:
          showToast(EarnToastOptions.mUsdConversion.success);
          shownToastsRef.current.add(toastKey);
          // Clean up entries for this transaction after final status
          setTimeout(() => {
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.approved}`,
            );
            shownToastsRef.current.delete(
              `${transactionId}-${TransactionStatus.confirmed}`,
            );
          }, 5000);
          break;
        case TransactionStatus.dropped:
        case TransactionStatus.rejected:
        case TransactionStatus.failed:
          showToast(EarnToastOptions.mUsdConversion.failed);
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
  }, [showToast, EarnToastOptions.mUsdConversion]);
};
