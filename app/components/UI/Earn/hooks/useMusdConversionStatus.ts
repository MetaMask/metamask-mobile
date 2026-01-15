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
import useEarnToasts from './useEarnToasts';

/**
 * Hook to monitor mUSD conversion transaction status and show appropriate toasts
 *
 * This hook:
 * 1. Subscribes to TransactionController:transactionStatusUpdated events
 * 2. Filters for mUSD conversion transactions (type === 'musdConversion')
 * 3. Shows toasts based on transaction status:
 * - approved → in-progress toast with token symbol (fires immediately after confirm)
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
    const getTokenData = (
      chainId: Hex,
      tokenAddress: string,
    ): { symbol: string; iconUrl?: string } => {
      const chainTokens = tokensCacheRef.current?.[chainId]?.data;
      if (!chainTokens) return { symbol: '' };

      const checksumAddress = safeToChecksumAddress(tokenAddress);
      const tokenData =
        chainTokens[checksumAddress as string] ||
        chainTokens[tokenAddress.toLowerCase()];

      return {
        symbol: tokenData?.symbol || '',
        iconUrl: tokenData?.iconUrl,
      };
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
          const tokenData = payTokenAddress
            ? getTokenData(payChainId as Hex, payTokenAddress)
            : { symbol: '' };
          const tokenSymbol = tokenData.symbol;

          showToast(
            EarnToastOptions.mUsdConversion.inProgress({
              tokenSymbol: tokenSymbol || 'Token',
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
