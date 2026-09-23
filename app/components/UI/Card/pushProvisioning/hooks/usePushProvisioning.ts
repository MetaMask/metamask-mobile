/**
 * usePushProvisioning Hook
 *
 * Main hook for push provisioning operations.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ProvisioningStatus,
  ProvisioningResult,
  ProvisioningError,
  UsePushProvisioningOptions,
  UsePushProvisioningReturn,
  CardActivationEvent,
  WalletEligibility,
  ProvisioningErrorCode,
} from '../types';
import { createPushProvisioningService, ProvisioningOptions } from '../service';
import { getCardProvider, getWalletProvider } from '../providers';
import { getWalletTypeForPlatform } from '../constants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { CardActions, withCardProvider } from '../../util/metrics';
import {
  selectIsCardAuthenticated,
  selectCardActiveProviderId,
} from '../../../../../selectors/cardController';
import { selectPushProvisioningEnabled } from '../../../../../selectors/featureFlagController/card';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import { strings } from '../../../../../../locales/i18n';

/**
 * Hook for push provisioning cards to mobile wallets
 *
 * This hook provides:
 * - Provisioning status tracking
 * - Error handling
 * - Analytics tracking
 * - Activation event listening
 *
 * Usage:
 * ```tsx
 * const {
 *   status,
 *   error,
 *   initiateProvisioning,
 *   isProvisioning,
 *   isSuccess,
 * } = usePushProvisioning({
 *   onSuccess: (result) => console.log('Provisioned!', result),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * // Use with the Button from @expensify/react-native-wallet
 * <Button onPress={initiateProvisioning} disabled={isProvisioning} />
 * ```
 */
export function usePushProvisioning(
  options: UsePushProvisioningOptions,
): UsePushProvisioningReturn {
  const {
    cardId,
    walletProvisioning,
    userAddress,
    onSuccess,
    onError,
    onCancel,
  } = options;

  const [status, setStatus] = useState<ProvisioningStatus>('idle');
  const [error, setError] = useState<ProvisioningError | null>(null);
  const { trackEvent, createEventBuilder } = useAnalytics();

  // Track current status in ref for use in activation listener
  const statusRef = useRef<ProvisioningStatus>(status);
  statusRef.current = status;

  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const capabilities = useCardCapabilities();
  const walletType = getWalletTypeForPlatform();
  const isPushProvisioningFeatureEnabled = useSelector(
    (state: Parameters<typeof selectPushProvisioningEnabled>[0]) =>
      selectPushProvisioningEnabled(state, activeProviderId, walletType),
  );

  const cardAdapter = useMemo(
    () => getCardProvider(capabilities, walletType),
    [capabilities, walletType],
  );

  const walletAdapter = useMemo(() => getWalletProvider(), []);

  // Check wallet eligibility (async) - includes availability and canAddCard checks
  const [eligibility, setEligibility] = useState<WalletEligibility | null>(
    null,
  );
  const [isEligibilityCheckLoading, setIsEligibilityCheckLoading] =
    useState(true);

  const lastFourDigits = walletProvisioning?.lastFour;

  useEffect(() => {
    let isMounted = true;

    const checkEligibility = async () => {
      setIsEligibilityCheckLoading(true);

      if (!walletAdapter || !lastFourDigits) {
        if (isMounted) {
          setEligibility({
            isAvailable: false,
            canAddCard: false,
            ineligibilityReason: 'Wallet provider not available',
          });
          setIsEligibilityCheckLoading(false);
        }
        return;
      }

      try {
        const result = await walletAdapter.getEligibility(lastFourDigits);
        if (isMounted) {
          setEligibility(result);
          setIsEligibilityCheckLoading(false);
        }
      } catch {
        if (isMounted) {
          setEligibility({
            isAvailable: false,
            canAddCard: false,
            ineligibilityReason: 'Failed to check eligibility',
          });
          setIsEligibilityCheckLoading(false);
        }
      }
    };

    checkEligibility();

    return () => {
      isMounted = false;
    };
  }, [walletAdapter, lastFourDigits]);

  useEffect(() => {
    if (status !== 'success') {
      return;
    }

    let isMounted = true;

    const recheckEligibility = async () => {
      if (!walletAdapter || !lastFourDigits) {
        return;
      }

      try {
        const result = await walletAdapter.getEligibility(lastFourDigits);
        if (isMounted) {
          setEligibility(result);
        }
      } catch {
        if (isMounted) {
          setEligibility({
            isAvailable: true,
            canAddCard: false,
            ineligibilityReason: 'Card already added to wallet',
          });
        }
      }
    };

    recheckEligibility();

    return () => {
      isMounted = false;
    };
  }, [status, walletAdapter, lastFourDigits]);

  // Create service with adapters
  const service = useMemo(
    () => createPushProvisioningService(cardAdapter, walletAdapter),
    [cardAdapter, walletAdapter],
  );

  // Store callbacks in refs to avoid re-renders
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onCancelRef = useRef(onCancel);

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onCancelRef.current = onCancel;
  }, [onSuccess, onError, onCancel]);

  // Ref for analytics tracking (to use in listener without dependency)
  const trackEventRef = useRef<typeof trackEvent>(trackEvent);
  const createEventBuilderRef =
    useRef<typeof createEventBuilder>(createEventBuilder);
  const cardAdapterProviderIdRef = useRef(cardAdapter?.providerId);
  const walletAdapterTypeRef = useRef(walletAdapter?.walletType);

  useEffect(() => {
    trackEventRef.current = trackEvent;
    createEventBuilderRef.current = createEventBuilder;
    cardAdapterProviderIdRef.current = cardAdapter?.providerId;
    walletAdapterTypeRef.current = walletAdapter?.walletType;
  }, [
    trackEvent,
    createEventBuilder,
    cardAdapter?.providerId,
    walletAdapter?.walletType,
  ]);

  // Set up activation listener for card activation events
  // Only process events when status is 'provisioning' to avoid duplicate handling
  // (initiateProvisioning already handles synchronous results)
  useEffect(() => {
    const unsubscribe = service.addActivationListener(
      (event: CardActivationEvent) => {
        // Skip if we're not in provisioning state - the result was already handled
        // by initiateProvisioning (e.g., error or cancel from the synchronous flow)
        if (statusRef.current !== 'provisioning') {
          return;
        }

        if (event.status === 'activated') {
          setStatus('success');

          // Track analytics
          try {
            trackEventRef.current(
              createEventBuilderRef
                .current(MetaMetricsEvents.CARD_PUSH_PROVISIONING_COMPLETED)
                .addProperties(
                  withCardProvider(cardAdapterProviderIdRef.current, {
                    card_provider_id: cardAdapterProviderIdRef.current,
                    wallet_type: walletAdapterTypeRef.current,
                    token_id: event.tokenId,
                  }),
                )
                .build(),
            );
          } catch {
            // Silently ignore analytics errors
          }

          onSuccessRef.current?.({
            status: 'success',
            tokenId: event.tokenId,
          });
        } else if (event.status === 'canceled') {
          // Handle cancel events from the native SDK's activation listener
          setStatus('idle');
          onCancelRef.current?.();
        } else if (event.status === 'failed') {
          const activationError = new ProvisioningError(
            ProvisioningErrorCode.UNKNOWN_ERROR,
            strings('card.push_provisioning.error_unknown'),
          );

          setStatus('error');
          setError(activationError);

          // Track analytics
          try {
            trackEventRef.current(
              createEventBuilderRef
                .current(MetaMetricsEvents.CARD_PUSH_PROVISIONING_FAILED)
                .addProperties(
                  withCardProvider(cardAdapterProviderIdRef.current, {
                    card_provider_id: cardAdapterProviderIdRef.current,
                    wallet_type: walletAdapterTypeRef.current,
                    error_code: activationError.code,
                    source: 'activation_listener',
                  }),
                )
                .build(),
            );
          } catch {
            // Silently ignore analytics errors
          }

          onErrorRef.current?.(activationError);
        }
      },
    );

    return unsubscribe;
  }, [service]);

  /**
   * Track analytics event
   */
  const trackAnalyticsEvent = useCallback(
    (
      event: (typeof MetaMetricsEvents)[keyof typeof MetaMetricsEvents],
      properties?: Record<string, unknown>,
    ) => {
      try {
        trackEvent(
          createEventBuilder(event)
            .addProperties(
              withCardProvider(cardAdapter?.providerId, {
                card_provider_id: cardAdapter?.providerId,
                wallet_type: walletAdapter?.walletType,
                ...properties,
              }),
            )
            .build(),
        );
      } catch {
        // Silently ignore analytics errors
      }
    },
    [
      cardAdapter?.providerId,
      walletAdapter?.walletType,
      trackEvent,
      createEventBuilder,
    ],
  );

  /**
   * Initiate provisioning
   *
   * Handles all terminal results (success, cancel, error) from the service directly.
   * The activation listener is a secondary mechanism for SDKs that also emit async
   * activation events (e.g. Google Wallet); it ignores events once statusRef is no
   * longer 'provisioning', so there is no double-handling.
   */
  const initiateProvisioning =
    useCallback(async (): Promise<ProvisioningResult> => {
      setStatus('provisioning');
      setError(null);

      trackAnalyticsEvent(MetaMetricsEvents.CARD_BUTTON_CLICKED, {
        action: CardActions.ADD_TO_WALLET_BUTTON,
      });
      trackAnalyticsEvent(MetaMetricsEvents.CARD_PUSH_PROVISIONING_STARTED);

      if (!cardId || !walletProvisioning) {
        const invalidCard = new ProvisioningError(
          ProvisioningErrorCode.INVALID_CARD_DATA,
          strings('card.push_provisioning.error_invalid_card_data'),
        );
        setStatus('error');
        setError(invalidCard);
        return {
          status: 'error',
          error: invalidCard,
        };
      }

      try {
        const provisioningOptions: ProvisioningOptions = {
          cardId,
          walletProvisioning,
          userAddress,
        };
        const result = await service.initiateProvisioning(provisioningOptions);

        // Handle all result statuses from the service
        // Note: On iOS, addCardToAppleWallet resolves with 'success' directly,
        // but the onCardActivated event may not fire. We handle success here
        // as the primary path, with the activation listener as a fallback.
        if (result.status === 'success') {
          setStatus('success');

          trackAnalyticsEvent(
            MetaMetricsEvents.CARD_PUSH_PROVISIONING_COMPLETED,
            { token_id: result.tokenId },
          );
          onSuccessRef.current?.({
            status: 'success',
            tokenId: result.tokenId,
          });
        } else if (result.status === 'canceled') {
          setStatus('idle');
          trackAnalyticsEvent(
            MetaMetricsEvents.CARD_PUSH_PROVISIONING_CANCELED,
          );
          onCancelRef.current?.();
        } else if (result.status === 'error') {
          setStatus('error');
          setError(result.error ?? null);
          trackAnalyticsEvent(MetaMetricsEvents.CARD_PUSH_PROVISIONING_FAILED, {
            error_code: result.error?.code,
          });
          if (result.error) {
            onErrorRef.current?.(result.error);
          }
        }

        return result;
      } catch (err) {
        const provisioningError =
          err instanceof ProvisioningError
            ? err
            : new ProvisioningError(
                'UNKNOWN_ERROR' as ProvisioningError['code'],
                err instanceof Error
                  ? err.message
                  : strings('card.push_provisioning.error_unknown'),
                err instanceof Error ? err : undefined,
              );

        setStatus('error');
        setError(provisioningError);

        trackAnalyticsEvent(MetaMetricsEvents.CARD_PUSH_PROVISIONING_FAILED, {
          error_code: provisioningError.code,
        });

        onErrorRef.current?.(provisioningError);

        return {
          status: 'error',
          error: provisioningError,
        };
      }
    }, [cardId, walletProvisioning, userAddress, trackAnalyticsEvent, service]);

  /**
   * Reset status to idle
   */
  const resetStatus = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const isLoading = isEligibilityCheckLoading;

  const canAddToWallet =
    isPushProvisioningFeatureEnabled &&
    isAuthenticated &&
    walletProvisioning?.eligible === true &&
    !isLoading &&
    !!cardAdapter &&
    !!walletAdapter &&
    eligibility?.isAvailable === true &&
    eligibility?.canAddCard === true &&
    status !== 'success';

  const existingCardStatus = eligibility?.existingCardStatus;
  const isCardInWallet =
    status === 'success' ||
    (existingCardStatus !== undefined &&
      existingCardStatus !== 'not_found' &&
      existingCardStatus !== 'requires_activation');

  return {
    status,
    error,
    initiateProvisioning,
    resetStatus,
    isProvisioning: status === 'provisioning',
    isSuccess: status === 'success',
    isError: status === 'error',
    isLoading,
    canAddToWallet,
    isCardInWallet,
  };
}
