import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectERC20TokensByChain } from '../../../../selectors/tokenListController';
import { safeToChecksumAddress } from '../../../../util/address';
import useEarnToasts from './useEarnToasts';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { decodeTransferData } from '../../../../util/transactions';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import NetworkList from '../../../../util/networks';

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
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const { showToast, EarnToastOptions } = useEarnToasts();
  const tokensChainsCache = useSelector(selectERC20TokensByChain);

  const { trackEvent, createEventBuilder } = useMetrics();

  const shownToastsRef = useRef<Set<string>>(new Set());
  const tokensCacheRef = useRef(tokensChainsCache);
  tokensCacheRef.current = tokensChainsCache;

  const getNetworkName = useCallback(
    (chainId?: Hex) => {
      if (!chainId) return 'Unknown Network';

      const nickname = networkConfigurations[chainId]?.name;

      const name = Object.values(NetworkList).find(
        (network: { chainId?: Hex; shortName: string }) =>
          network.chainId === chainId,
      )?.shortName;

      return name ?? nickname ?? chainId;
    },
    [networkConfigurations],
  );

  const submitConversionEvent = useCallback(
    (
      transactionMeta: TransactionMeta,
      token: { name: string; symbol: string },
    ) => {
      const [, amountDecimalString, amountHexString] = decodeTransferData(
        'transfer',
        transactionMeta?.txParams?.data || '',
      );

      trackEvent(
        createEventBuilder(MetaMetricsEvents.MUSD_CONVERSION_STATUS_UPDATED)
          .addProperties({
            transaction_id: transactionMeta.id,
            transaction_status: transactionMeta.status,
            transaction_type: transactionMeta.type,
            asset_symbol: token.symbol,
            network_chain_id: transactionMeta?.chainId,
            network_name: getNetworkName(transactionMeta?.chainId),
            amount_decimal: amountDecimalString,
            amount_hex: amountHexString,
          })
          .build(),
      );
    },
    [createEventBuilder, getNetworkName, trackEvent],
  );

  useEffect(() => {
    const getTokenData = (chainId: Hex, tokenAddress: string) => {
      const chainTokens = tokensCacheRef.current?.[chainId]?.data;
      if (!chainTokens) return { symbol: '', name: '' };

      const checksumAddress = safeToChecksumAddress(tokenAddress);
      const tokenData =
        chainTokens[checksumAddress as string] ||
        chainTokens[tokenAddress.toLowerCase()];

      return {
        symbol: tokenData?.symbol || '',
        iconUrl: tokenData?.iconUrl,
        name: tokenData?.name || '',
      };
    };

    // Shared helper to validate and extract common data for mUSD conversion handlers
    const getConversionData = (
      transactionMeta: TransactionMeta,
      status: TransactionStatus,
    ) => {
      if (transactionMeta.type !== TransactionType.musdConversion) {
        return null;
      }

      const { id: transactionId, metamaskPay } = transactionMeta;
      const { chainId: payChainId, tokenAddress: payTokenAddress } =
        metamaskPay || {};

      const toastKey = `${transactionId}-${status}`;

      if (shownToastsRef.current.has(toastKey)) {
        return null;
      }

      const tokenData = payTokenAddress
        ? getTokenData(payChainId as Hex, payTokenAddress)
        : { symbol: '', name: '' };

      return { transactionId, tokenData, toastKey };
    };

    // Handle approved and failed statuses via transactionStatusUpdated
    const handleTransactionStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      const data = getConversionData(transactionMeta, transactionMeta.status);
      if (!data) return;

      const { transactionId, tokenData, toastKey } = data;

      switch (transactionMeta.status) {
        case TransactionStatus.approved: {
          submitConversionEvent(transactionMeta, tokenData);
          // Get token info for the in-progress toast
          // Using 'approved' status to show toast immediately after user confirms
          showToast(
            EarnToastOptions.mUsdConversion.inProgress({
              tokenSymbol: tokenData.symbol || 'Token',
            }),
          );
          shownToastsRef.current.add(toastKey);
          break;
        }
        case TransactionStatus.failed:
          submitConversionEvent(transactionMeta, tokenData);
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

    // Handle confirmed status via transactionConfirmed event
    // This event fires at the same time as TokenBalancesController updates balances,
    // ensuring the success toast appears in sync with the balance change in the UI
    // Note: transactionConfirmed can fire with failed status (see useCardDelegation.ts pattern)
    const handleTransactionConfirmed = (transactionMeta: TransactionMeta) => {
      // Only handle confirmed status - failed status is handled by transactionStatusUpdated
      if (transactionMeta.status !== TransactionStatus.confirmed) {
        return;
      }

      const data = getConversionData(
        transactionMeta,
        TransactionStatus.confirmed,
      );
      if (!data) return;

      const { transactionId, tokenData, toastKey } = data;

      submitConversionEvent(transactionMeta, tokenData);
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
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdated,
    );

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleTransactionConfirmed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleTransactionConfirmed,
      );
    };
  }, [showToast, EarnToastOptions.mUsdConversion, submitConversionEvent]);
};
