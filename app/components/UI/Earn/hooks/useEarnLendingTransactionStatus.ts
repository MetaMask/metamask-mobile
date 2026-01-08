import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { EarnTokenDetails } from '../types/lending.types';
import {
  LENDING_TYPES,
  TransactionEventType,
  LendingTransactionInfo,
  DecodedLendingData,
  getLendingTransactionInfo,
  decodeLendingTransactionData,
  getTrackEventProperties,
  getMetricsEvent,
} from '../utils/lending-transaction';
import {
  fetchTokenSnapshot,
  getTokenSnapshotFromState,
  getEarnTokenPairAddressesFromState,
} from '../utils/token-snapshot';
import useEarnTokens from './useEarnTokens';
import { TokenI } from '../../Tokens/types';

// Max number of transaction event keys to track for deduplication
const MAX_PROCESSED_TRANSACTIONS = 100;

/**
 * Hook to monitor lending transaction lifecycle and add receipt/underlying tokens.
 * Subscribes to TransactionController lifecycle events and tracks analytics.
 * Supports both 1-click batch flow and legacy direct transactions.
 * On confirmation: adds receipt token (deposits) or underlying token (withdrawals).
 */
export const useEarnLendingTransactionStatus = () => {
  const { getEarnToken, getOutputToken } = useEarnTokens();
  const { trackEvent, createEventBuilder } = useMetrics();
  const processedTransactionsRef = useRef<Set<string>>(new Set());

  // Use refs to avoid stale closures in event handlers
  const trackEventRef = useRef(trackEvent);
  const createEventBuilderRef = useRef(createEventBuilder);

  trackEventRef.current = trackEvent;
  createEventBuilderRef.current = createEventBuilder;

  useEffect(() => {
    /**
     * Track analytics event for lending transaction
     */
    const trackLendingEvent = (
      transactionMeta: TransactionMeta,
      eventType: TransactionEventType,
      lendingInfo: LendingTransactionInfo,
      earnToken: EarnTokenDetails | undefined,
      decodedData: DecodedLendingData | null,
      networkName: string | undefined,
    ) => {
      const actionType =
        lendingInfo.type === TransactionType.lendingDeposit
          ? 'deposit'
          : 'withdrawal';
      const metricsEvent = getMetricsEvent(eventType);
      const properties = getTrackEventProperties(
        transactionMeta,
        actionType,
        earnToken,
        decodedData?.amountMinimalUnit,
        networkName,
      );

      trackEventRef.current(
        createEventBuilderRef
          .current(metricsEvent)
          .addProperties(properties)
          .build(),
      );
    };

    /**
     * Pre-fetch token data on submitted event.
     * For deposits: pre-fetch outputToken (receipt token) if not known.
     * For withdrawals: pre-fetch earnToken (underlying token) if not known.
     * This gives time for the data to be available by the time confirmed fires.
     */
    const prefetchTokenOnSubmitted = (
      transactionMeta: TransactionMeta,
      lendingInfo: LendingTransactionInfo,
      earnToken: EarnTokenDetails | undefined,
      outputToken: EarnTokenDetails | undefined,
    ) => {
      const chainId = transactionMeta.chainId as Hex;
      const isDeposit = lendingInfo.type === TransactionType.lendingDeposit;

      if (isDeposit) {
        // For deposits: pre-fetch outputToken if not known
        if (outputToken) {
          return;
        }

        const outputTokenAddress =
          earnToken?.experience?.market?.outputToken?.address;
        if (!outputTokenAddress) {
          return;
        }

        fetchTokenSnapshot(chainId, outputTokenAddress as Hex).catch(() => {
          // Pre-fetch failed silently
        });
      } else {
        // For withdrawals: pre-fetch earnToken (underlying) if not known
        if (earnToken) {
          return;
        }

        const underlyingTokenAddress =
          outputToken?.experience?.market?.underlying?.address;
        if (!underlyingTokenAddress) {
          return;
        }

        fetchTokenSnapshot(chainId, underlyingTokenAddress as Hex).catch(() => {
          // Pre-fetch failed silently
        });
      }
    };

    /**
     * Add token to wallet on confirmation
     */
    const addTokenOnConfirmation = (
      transactionMeta: TransactionMeta,
      lendingInfo: LendingTransactionInfo,
      earnToken: EarnTokenDetails | undefined,
      outputToken: EarnTokenDetails | undefined,
    ) => {
      const chainId = transactionMeta.chainId as Hex;
      const isDeposit = lendingInfo.type === TransactionType.lendingDeposit;

      try {
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            chainId,
          );

        if (isDeposit) {
          // For deposits, add the receipt/output token
          if (outputToken) {
            Engine.context.TokensController.addToken({
              decimals: outputToken.decimals || 0,
              symbol: outputToken.symbol || '',
              address: outputToken.address || '',
              name: outputToken.name || outputToken.symbol || '',
              networkClientId,
            }).catch(() => {
              // Token addition failed silently
            });
          } else {
            // Fallback: try to get from pre-fetched token snapshot
            const outputTokenAddress =
              earnToken?.experience?.market?.outputToken?.address;
            if (outputTokenAddress) {
              const snapshot = getTokenSnapshotFromState(
                chainId,
                outputTokenAddress as Hex,
              );
              if (snapshot?.token) {
                Engine.context.TokensController.addToken({
                  decimals: snapshot.token.decimals || 0,
                  symbol: snapshot.token.symbol || '',
                  address: snapshot.address || '',
                  name: snapshot.token.name || snapshot.token.symbol || '',
                  networkClientId,
                }).catch(() => {
                  // Token addition failed silently
                });
              }
            }
          }
        } else if (!isDeposit) {
          // For withdrawals, add the underlying/earn token
          if (earnToken) {
            Engine.context.TokensController.addToken({
              decimals: earnToken.decimals || 0,
              symbol: earnToken.symbol || '',
              address: earnToken.address || '',
              name: earnToken.name || earnToken.symbol || '',
              networkClientId,
            }).catch(() => {
              // Token addition failed silently
            });
          } else {
            // Fallback: try to get from pre-fetched token snapshot
            const underlyingTokenAddress =
              outputToken?.experience?.market?.underlying?.address;
            if (underlyingTokenAddress) {
              const snapshot = getTokenSnapshotFromState(
                chainId,
                underlyingTokenAddress as Hex,
              );
              if (snapshot?.token) {
                Engine.context.TokensController.addToken({
                  decimals: snapshot.token.decimals || 0,
                  symbol: snapshot.token.symbol || '',
                  address: snapshot.address || '',
                  name: snapshot.token.name || snapshot.token.symbol || '',
                  networkClientId,
                }).catch(() => {
                  // Token addition failed silently
                });
              }
            }
          }
        }
      } catch {
        // Error handling silently
      }
    };

    /**
     * Handle transaction events
     */
    const handleTransactionEvent = (
      transactionMeta: TransactionMeta,
      eventType: TransactionEventType,
    ) => {
      // Check if this is a lending transaction (direct or batch)
      const isLending = hasTransactionType(transactionMeta, LENDING_TYPES);

      if (!isLending) {
        return;
      }

      // Deduplicate by transaction ID + event type
      const eventKey = `${transactionMeta.id}-${eventType}`;
      const isDuplicate = processedTransactionsRef.current.has(eventKey);

      if (isDuplicate) {
        return;
      }

      // Evict oldest entry if at capacity (Set maintains insertion order)
      const processedSet = processedTransactionsRef.current;
      if (processedSet.size >= MAX_PROCESSED_TRANSACTIONS) {
        const oldest = processedSet.values().next().value;
        if (oldest) processedSet.delete(oldest);
      }
      processedSet.add(eventKey);

      // Extract lending transaction info
      const lendingInfo = getLendingTransactionInfo(transactionMeta);
      if (!lendingInfo) {
        return;
      }

      // Decode transaction data to get token address and amount
      const decodedData = decodeLendingTransactionData(lendingInfo);
      let earnToken: EarnTokenDetails | undefined;
      let outputToken: EarnTokenDetails | undefined;

      const chainId = transactionMeta.chainId as Hex;

      // Look up network name for analytics
      const networkConfig =
        Engine.context.NetworkController.getNetworkConfigurationByChainId(
          chainId,
        );
      const networkName = networkConfig?.name;

      if (decodedData?.tokenAddress) {
        // Read directly from Engine.state to get latest data (bypasses React render cycle)
        const tokenPair = getEarnTokenPairAddressesFromState(
          chainId,
          decodedData.tokenAddress,
        );
        earnToken = getEarnToken({
          chainId,
          address: tokenPair.earnToken as Hex,
        } as TokenI);
        outputToken = getOutputToken({
          chainId,
          address: tokenPair.outputToken as Hex,
        } as TokenI);
      }

      // Track analytics
      trackLendingEvent(
        transactionMeta,
        eventType,
        lendingInfo,
        earnToken,
        decodedData,
        networkName,
      );

      // Handle submitted-specific actions
      if (eventType === 'submitted') {
        // Track EARN_TRANSACTION_INITIATED (this was previously tracked when tx was first created)
        const actionType =
          lendingInfo.type === TransactionType.lendingDeposit
            ? 'deposit'
            : 'withdrawal';
        const initiatedProperties = getTrackEventProperties(
          transactionMeta,
          actionType,
          earnToken,
          decodedData?.amountMinimalUnit,
          networkName,
        );
        trackEventRef.current(
          createEventBuilderRef
            .current(MetaMetricsEvents.EARN_TRANSACTION_INITIATED)
            .addProperties(initiatedProperties)
            .build(),
        );

        // Track allowance transaction if present in batch
        const hasAllowanceTx = transactionMeta.nestedTransactions?.some(
          (tx) =>
            tx.type === TransactionType.tokenMethodApprove ||
            tx.type === TransactionType.tokenMethodIncreaseAllowance,
        );
        if (hasAllowanceTx) {
          trackEventRef.current(
            createEventBuilderRef
              .current(MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED)
              .addProperties({
                ...initiatedProperties,
                transaction_type: TransactionType.tokenMethodIncreaseAllowance,
                is_allowance: true,
              })
              .build(),
          );
        }

        // Pre-fetch token (output for deposits, underlying for withdrawals)
        prefetchTokenOnSubmitted(
          transactionMeta,
          lendingInfo,
          earnToken,
          outputToken,
        );
      } else if (eventType === 'confirmed') {
        // Track allowance confirmed if present in batch
        const hasAllowanceTx = transactionMeta.nestedTransactions?.some(
          (tx) =>
            tx.type === TransactionType.tokenMethodApprove ||
            tx.type === TransactionType.tokenMethodIncreaseAllowance,
        );
        if (hasAllowanceTx) {
          const actionType =
            lendingInfo.type === TransactionType.lendingDeposit
              ? 'deposit'
              : 'withdrawal';
          const allowanceProperties = getTrackEventProperties(
            transactionMeta,
            actionType,
            earnToken,
            decodedData?.amountMinimalUnit,
            networkName,
          );
          trackEventRef.current(
            createEventBuilderRef
              .current(MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED)
              .addProperties({
                ...allowanceProperties,
                transaction_type: TransactionType.tokenMethodIncreaseAllowance,
                is_allowance: true,
              })
              .build(),
          );
        }

        // Add token on confirmation
        addTokenOnConfirmation(
          transactionMeta,
          lendingInfo,
          earnToken,
          outputToken,
        );
      }
    };

    // Event handlers
    const handleSubmitted = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => handleTransactionEvent(transactionMeta, 'submitted');

    const handleConfirmed = (transactionMeta: TransactionMeta) =>
      handleTransactionEvent(transactionMeta, 'confirmed');

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => handleTransactionEvent(transactionMeta, 'rejected');

    const handleDropped = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => handleTransactionEvent(transactionMeta, 'dropped');

    const handleFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => handleTransactionEvent(transactionMeta, 'failed');

    // Subscribe to all transaction lifecycle events
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionSubmitted',
      handleSubmitted,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      handleConfirmed,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionRejected',
      handleRejected,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionDropped',
      handleDropped,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      handleFailed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionSubmitted',
        handleSubmitted,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        handleConfirmed,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionRejected',
        handleRejected,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionDropped',
        handleDropped,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionFailed',
        handleFailed,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
