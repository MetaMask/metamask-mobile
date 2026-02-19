import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import type { TransactionPayQuote } from '@metamask/transaction-pay-controller';
import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectERC20TokensByChain } from '../../../../selectors/tokenListController';
import { safeToChecksumAddress } from '../../../../util/address';
import useEarnToasts from './useEarnToasts';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { decodeTransferData } from '../../../../util/transactions';
import { TOAST_TRACKING_CLEANUP_DELAY_MS } from '../constants/musd';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { store } from '../../../../store';
import { selectTransactionPayQuotesByTransactionId } from '../../../../selectors/transactionPayController';
import { getNetworkName } from '../utils/network';

type PayQuote = TransactionPayQuote<unknown>;

function chainIdsMatch(a?: Hex, b?: Hex): boolean | undefined {
  if (!a || !b) return undefined;
  return a.toLowerCase() === b.toLowerCase();
}

function getTransactionPayQuotes(transactionId: string): PayQuote[] {
  const state = store.getState();
  return (
    (selectTransactionPayQuotesByTransactionId(state, transactionId) as
      | PayQuote[]
      | undefined) ?? []
  );
}

function getMusdConversionQuoteTrackingData(transactionMeta: TransactionMeta): {
  quotePaymentChainId?: Hex;
  quoteOutputChainId?: Hex;
  quotePaymentTokenAddress?: Hex;
  quoteOutputTokenAddress?: Hex;
  quoteIsSameChain?: boolean;
  strategy: string;
  paymentAmountUsd?: string;
  outputAmountUsd?: string;
  selectedPaymentChainId?: Hex;
  selectedPaymentChainMatchesQuotePaymentChain?: boolean;
  txExecutionChainMatchesQuoteOutputChain?: boolean;
  paymentTokenAddress?: Hex;
  paymentTokenChainId?: Hex;
  outputTokenAddress?: Hex;
  outputTokenChainId?: Hex;
} {
  const quote = getTransactionPayQuotes(transactionMeta.id)[0];
  const quoteRequest: PayQuote['request'] | undefined = quote?.request;

  const quotePaymentChainId = quoteRequest?.sourceChainId;
  const quoteOutputChainId = quoteRequest?.targetChainId;
  const quotePaymentTokenAddress = quoteRequest?.sourceTokenAddress;
  const quoteOutputTokenAddress = quoteRequest?.targetTokenAddress;

  const quoteIsSameChain = chainIdsMatch(
    quotePaymentChainId,
    quoteOutputChainId,
  );

  const strategy = quote?.strategy
    ? String(quote.strategy).toLowerCase()
    : 'unknown';

  const paymentAmountUsd = quote?.sourceAmount?.usd;
  const outputAmountUsd = quote?.targetAmount?.usd;

  const selectedPaymentChainId = transactionMeta.metamaskPay?.chainId;
  const selectedPaymentTokenAddress = transactionMeta.metamaskPay?.tokenAddress;

  const selectedPaymentChainMatchesQuotePaymentChain = chainIdsMatch(
    selectedPaymentChainId,
    quotePaymentChainId,
  );

  const txExecutionChainMatchesQuoteOutputChain = chainIdsMatch(
    transactionMeta?.chainId,
    quoteOutputChainId,
  );

  const paymentTokenAddress =
    selectedPaymentTokenAddress ?? quotePaymentTokenAddress;
  const paymentTokenChainId = selectedPaymentChainId ?? quotePaymentChainId;

  const outputTokenAddress =
    quoteOutputTokenAddress ??
    (transactionMeta?.txParams?.to as Hex | undefined);
  const outputTokenChainId = quoteOutputChainId ?? transactionMeta?.chainId;

  return {
    quotePaymentChainId,
    quoteOutputChainId,
    quotePaymentTokenAddress,
    quoteOutputTokenAddress,
    quoteIsSameChain,
    strategy,
    paymentAmountUsd,
    outputAmountUsd,
    selectedPaymentChainId,
    selectedPaymentChainMatchesQuotePaymentChain,
    txExecutionChainMatchesQuoteOutputChain,
    paymentTokenAddress,
    paymentTokenChainId,
    outputTokenAddress,
    outputTokenChainId,
  };
}

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

  const { trackEvent, createEventBuilder } = useAnalytics();

  const shownToastsRef = useRef<Set<string>>(new Set());
  const tokensCacheRef = useRef(tokensChainsCache);
  tokensCacheRef.current = tokensChainsCache;

  const submitConversionEvent = useCallback(
    (
      transactionMeta: TransactionMeta,
      token: { name: string; symbol: string },
    ) => {
      let amountDecimalString = '';
      let amountHexString = '';

      try {
        const decoded = decodeTransferData(
          'transfer',
          transactionMeta?.txParams?.data || '',
        );
        amountDecimalString = decoded?.[1] ?? '';
        amountHexString = decoded?.[2] ?? '';
      } catch {
        // If txParams.data is malformed or missing, keep amounts empty.
      }

      const {
        quotePaymentChainId,
        quoteOutputChainId,
        quotePaymentTokenAddress,
        quoteOutputTokenAddress,
        quoteIsSameChain,
        strategy,
        paymentAmountUsd,
        outputAmountUsd,
        selectedPaymentChainId,
        selectedPaymentChainMatchesQuotePaymentChain,
        txExecutionChainMatchesQuoteOutputChain,
        paymentTokenAddress,
        paymentTokenChainId,
        outputTokenAddress,
        outputTokenChainId,
      } = getMusdConversionQuoteTrackingData(transactionMeta);

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

            // Quote-derived (primary)
            quote_payment_chain_id: quotePaymentChainId,
            quote_output_chain_id: quoteOutputChainId,
            quote_is_same_chain: quoteIsSameChain,
            quote_payment_token_address: quotePaymentTokenAddress,
            quote_output_token_address: quoteOutputTokenAddress,
            payment_amount_usd: paymentAmountUsd,
            output_amount_usd: outputAmountUsd,
            pay_quote_strategy: strategy,

            // Secondary consistency checks.
            selected_payment_chain_id: selectedPaymentChainId,
            selected_payment_chain_matches_quote_payment_chain:
              selectedPaymentChainMatchesQuotePaymentChain,
            tx_execution_chain_matches_quote_output_chain:
              txExecutionChainMatchesQuoteOutputChain,

            // Explicit token identity (in/out).
            payment_token_address: paymentTokenAddress,
            payment_token_chain_id: paymentTokenChainId,

            output_token_address: outputTokenAddress,
            output_token_chain_id: outputTokenChainId,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
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

    // Schedule cleanup of toast tracking entries after final transaction status
    const scheduleCleanup = (
      transactionId: string,
      finalStatus: TransactionStatus,
    ) => {
      setTimeout(() => {
        shownToastsRef.current.delete(
          `${transactionId}-${TransactionStatus.approved}`,
        );
        shownToastsRef.current.delete(`${transactionId}-${finalStatus}`);
      }, TOAST_TRACKING_CLEANUP_DELAY_MS);
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

          // Get quotes from state to include strategy in trace
          const state = store.getState();
          const quotes = selectTransactionPayQuotesByTransactionId(
            state,
            transactionId,
          );

          // Start confirmation trace (approved fires immediately after user confirms)
          trace({
            name: TraceName.MusdConversionConfirm,
            op: TraceOperation.MusdConversionOperation,
            id: transactionId,
            tags: {
              transactionId,
              chainId: transactionMeta.chainId ?? 'unknown',
              strategy: quotes?.[0]?.strategy ?? 'unknown',
            },
          });
          break;
        }
        case TransactionStatus.failed:
          submitConversionEvent(transactionMeta, tokenData);
          showToast(EarnToastOptions.mUsdConversion.failed);
          shownToastsRef.current.add(toastKey);
          // End confirmation trace on failure
          endTrace({
            name: TraceName.MusdConversionConfirm,
            id: transactionId,
            data: {
              success: false,
              status: TransactionStatus.failed,
            },
          });
          scheduleCleanup(transactionId, TransactionStatus.failed);
          break;
        case TransactionStatus.rejected:
        case TransactionStatus.dropped:
        case TransactionStatus.cancelled:
          // End confirmation trace for terminal statuses (no toast needed)
          endTrace({
            name: TraceName.MusdConversionConfirm,
            id: transactionId,
            data: {
              success: false,
              status: transactionMeta.status,
            },
          });
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
      // End confirmation trace on success
      endTrace({
        name: TraceName.MusdConversionConfirm,
        id: transactionId,
        data: {
          success: true,
          status: TransactionStatus.confirmed,
        },
      });
      scheduleCleanup(transactionId, TransactionStatus.confirmed);
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
