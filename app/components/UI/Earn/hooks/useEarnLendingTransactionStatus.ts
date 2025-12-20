import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
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

const LOG_TAG = '[EarnLendingTxStatus]';

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
    Logger.log(LOG_TAG, '=== HOOK MOUNTED ===');
    Logger.log(
      LOG_TAG,
      'Subscribing to 5 transaction events: submitted, confirmed, rejected, dropped, failed',
    );

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

      Logger.log(
        LOG_TAG,
        `[trackLendingEvent] 📊 Tracking EARN_TRANSACTION_${eventType.toUpperCase()}`,
        properties,
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
          Logger.log(
            LOG_TAG,
            '[prefetchToken] ⚠️ Deposit: No output token address in earnToken market data',
          );
          return;
        }

        Logger.log(
          LOG_TAG,
          '[prefetchToken] 🔄 Deposit: Pre-fetching output token data',
          { chainId, outputTokenAddress },
        );

        fetchTokenSnapshot(chainId, outputTokenAddress as Hex).catch(
          (error) => {
            Logger.log(
              LOG_TAG,
              '[prefetchToken] ❌ Deposit: Pre-fetch failed',
              { error },
            );
          },
        );
      } else {
        // For withdrawals: pre-fetch earnToken (underlying) if not known
        if (earnToken) {
          return;
        }

        const underlyingTokenAddress =
          outputToken?.experience?.market?.underlying?.address;
        if (!underlyingTokenAddress) {
          Logger.log(
            LOG_TAG,
            '[prefetchToken] ⚠️ Withdrawal: No underlying token address in outputToken market data',
          );
          return;
        }

        Logger.log(
          LOG_TAG,
          '[prefetchToken] 🔄 Withdrawal: Pre-fetching underlying token data',
          { chainId, underlyingTokenAddress },
        );

        fetchTokenSnapshot(chainId, underlyingTokenAddress as Hex).catch(
          (error) => {
            Logger.log(
              LOG_TAG,
              '[prefetchToken] ❌ Withdrawal: Pre-fetch failed',
              { error },
            );
          },
        );
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
      Logger.log(
        LOG_TAG,
        '[addTokenOnConfirmation] Starting token addition...',
      );

      const chainId = transactionMeta.chainId as Hex;
      const isDeposit = lendingInfo.type === TransactionType.lendingDeposit;

      try {
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            chainId,
          );

        Logger.log(LOG_TAG, '[addTokenOnConfirmation] Network client found', {
          networkClientId,
        });

        if (isDeposit) {
          // For deposits, add the receipt/output token
          if (outputToken) {
            Logger.log(
              LOG_TAG,
              '[addTokenOnConfirmation] 💰 Adding RECEIPT token (from earnTokens)',
              {
                symbol: outputToken.symbol,
                address: outputToken.address,
                decimals: outputToken.decimals,
              },
            );
            Engine.context.TokensController.addToken({
              decimals: outputToken.decimals || 0,
              symbol: outputToken.symbol || '',
              address: outputToken.address || '',
              name: outputToken.name || outputToken.symbol || '',
              networkClientId,
            })
              .then(() => {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ✓ Receipt token added successfully',
                );
              })
              .catch((error) => {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ❌ Failed to add receipt token',
                  { error },
                );
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
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] 💰 Adding RECEIPT token (from snapshot)',
                  {
                    symbol: snapshot.token.symbol,
                    address: snapshot.address,
                    decimals: snapshot.token.decimals,
                  },
                );
                Engine.context.TokensController.addToken({
                  decimals: snapshot.token.decimals || 0,
                  symbol: snapshot.token.symbol || '',
                  address: snapshot.address || '',
                  name: snapshot.token.name || snapshot.token.symbol || '',
                  networkClientId,
                })
                  .then(() => {
                    Logger.log(
                      LOG_TAG,
                      '[addTokenOnConfirmation] ✓ Receipt token added from snapshot',
                    );
                  })
                  .catch((error) => {
                    Logger.log(
                      LOG_TAG,
                      '[addTokenOnConfirmation] ❌ Failed to add receipt token from snapshot',
                      { error },
                    );
                  });
              } else {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ⚠️ No output token or snapshot available',
                );
              }
            } else {
              Logger.log(
                LOG_TAG,
                '[addTokenOnConfirmation] ⚠️ No output token address available',
              );
            }
          }
        } else if (!isDeposit) {
          // For withdrawals, add the underlying/earn token
          if (earnToken) {
            Logger.log(
              LOG_TAG,
              '[addTokenOnConfirmation] 💰 Adding UNDERLYING token (from earnTokens)',
              {
                symbol: earnToken.symbol,
                address: earnToken.address,
                decimals: earnToken.decimals,
              },
            );
            Engine.context.TokensController.addToken({
              decimals: earnToken.decimals || 0,
              symbol: earnToken.symbol || '',
              address: earnToken.address || '',
              name: earnToken.name || earnToken.symbol || '',
              networkClientId,
            })
              .then(() => {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ✓ Underlying token added successfully',
                );
              })
              .catch((error) => {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ❌ Failed to add underlying token',
                  { error },
                );
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
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] 💰 Adding UNDERLYING token (from snapshot)',
                  {
                    symbol: snapshot.token.symbol,
                    address: snapshot.address,
                    decimals: snapshot.token.decimals,
                  },
                );
                Engine.context.TokensController.addToken({
                  decimals: snapshot.token.decimals || 0,
                  symbol: snapshot.token.symbol || '',
                  address: snapshot.address || '',
                  name: snapshot.token.name || snapshot.token.symbol || '',
                  networkClientId,
                })
                  .then(() => {
                    Logger.log(
                      LOG_TAG,
                      '[addTokenOnConfirmation] ✓ Underlying token added from snapshot',
                    );
                  })
                  .catch((error) => {
                    Logger.log(
                      LOG_TAG,
                      '[addTokenOnConfirmation] ❌ Failed to add underlying token from snapshot',
                      { error },
                    );
                  });
              } else {
                Logger.log(
                  LOG_TAG,
                  '[addTokenOnConfirmation] ⚠️ No earnToken or snapshot available for withdrawal',
                );
              }
            } else {
              Logger.log(
                LOG_TAG,
                '[addTokenOnConfirmation] ⚠️ No underlying token address available for withdrawal',
              );
            }
          }
        }
      } catch (error) {
        Logger.log(LOG_TAG, '[addTokenOnConfirmation] ❌ Error', { error });
      }
    };

    /**
     * Handle transaction events
     */
    const handleTransactionEvent = (
      transactionMeta: TransactionMeta,
      eventType: TransactionEventType,
    ) => {
      Logger.log(
        LOG_TAG,
        `\n========== TX EVENT: ${eventType.toUpperCase()} ==========`,
      );
      Logger.log(LOG_TAG, 'Transaction metadata:', {
        id: transactionMeta.id,
        type: transactionMeta.type,
        chainId: transactionMeta.chainId,
        hasNestedTx: Boolean(transactionMeta.nestedTransactions?.length),
        nestedCount: transactionMeta.nestedTransactions?.length ?? 0,
      });

      // Check if this is a lending transaction (direct or batch)
      const isLending = hasTransactionType(transactionMeta, LENDING_TYPES);
      Logger.log(
        LOG_TAG,
        `[Step 1] Is lending transaction? ${isLending ? '✓ YES' : '✗ NO'}`,
      );

      if (!isLending) {
        Logger.log(LOG_TAG, '--- Ignoring non-lending transaction ---\n');
        return;
      }

      // Deduplicate by transaction ID + event type
      const eventKey = `${transactionMeta.id}-${eventType}`;
      const isDuplicate = processedTransactionsRef.current.has(eventKey);
      Logger.log(
        LOG_TAG,
        `[Step 2] Duplicate check: ${isDuplicate ? '⚠️ DUPLICATE - skipping' : '✓ New event'}`,
      );

      if (isDuplicate) {
        Logger.log(LOG_TAG, '--- Skipping duplicate event ---\n');
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
      Logger.log(LOG_TAG, '[Step 3] Extracting lending transaction info...');
      const lendingInfo = getLendingTransactionInfo(transactionMeta);
      if (!lendingInfo) {
        Logger.log(LOG_TAG, '❌ Could not extract lending info - aborting\n');
        return;
      }
      Logger.log(
        LOG_TAG,
        `[Step 3] ✓ Lending info extracted: ${lendingInfo.type}`,
      );

      // Decode transaction data to get token address and amount
      Logger.log(LOG_TAG, '[Step 4] Decoding lending transaction data...');
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
        Logger.log(LOG_TAG, '[Step 4] ✓ Token lookup complete', {
          earnTokenSymbol: earnToken?.symbol ?? 'not found',
          outputTokenSymbol: outputToken?.symbol ?? 'not found',
          amountMinimalUnit: decodedData.amountMinimalUnit,
          networkName,
        });
      } else {
        Logger.log(
          LOG_TAG,
          '[Step 4] ⚠️ No decoded data - tracking without token info',
        );
      }

      // Track analytics
      Logger.log(LOG_TAG, '[Step 5] Tracking analytics event...');
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
        Logger.log(
          LOG_TAG,
          '[Step 6a] Event is SUBMITTED - tracking EARN_TRANSACTION_INITIATED...',
        );
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
          Logger.log(
            LOG_TAG,
            '[Step 6b] Batch contains allowance tx - tracking allowance submitted...',
          );
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
        Logger.log(LOG_TAG, '[Step 6c] Pre-fetching token if needed...');
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
          Logger.log(
            LOG_TAG,
            '[Step 6a] Batch contains allowance tx - tracking allowance confirmed...',
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
        Logger.log(
          LOG_TAG,
          '[Step 6b] Event is CONFIRMED - adding token to wallet...',
        );
        addTokenOnConfirmation(
          transactionMeta,
          lendingInfo,
          earnToken,
          outputToken,
        );
      } else {
        Logger.log(
          LOG_TAG,
          `[Step 6] Event is ${eventType.toUpperCase()} - no action needed`,
        );
      }

      Logger.log(
        LOG_TAG,
        `========== END ${eventType.toUpperCase()} ==========\n`,
      );
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

    Logger.log(LOG_TAG, '=== SUBSCRIPTIONS COMPLETE ===\n');

    return () => {
      Logger.log(LOG_TAG, '=== HOOK UNMOUNTING ===');
      Logger.log(LOG_TAG, 'Unsubscribing from all events...');
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
      Logger.log(LOG_TAG, '=== UNSUBSCRIBED ===\n');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
