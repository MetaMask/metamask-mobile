/**
 * usePushProvisioning Hook
 *
 * Main hook for push provisioning operations.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
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
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useCardSDK } from '../../sdk';
import {
  selectIsAuthenticatedCard,
  selectUserCardLocation,
} from '../../../../../core/redux/slices/card';
import {
  selectGalileoAppleWalletProvisioningEnabled,
  selectGalileoGoogleWalletProvisioningEnabled,
} from '../../../../../selectors/featureFlagController/card';
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
  const { cardDetails, userAddress, onSuccess, onError, onCancel } = options;

  const [status, setStatus] = useState<ProvisioningStatus>('idle');
  const [error, setError] = useState<ProvisioningError | null>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  // Track current status in ref for use in activation listener
  const statusRef = useRef<ProvisioningStatus>(status);
  statusRef.current = status;

  // Get SDK and location
  const { sdk: cardSDK, isLoading: isSDKLoading } = useCardSDK();
  const userCardLocation = useSelector(selectUserCardLocation);
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  // Get feature flags for push provisioning
  const isAppleWalletProvisioningEnabled = useSelector(
    selectGalileoAppleWalletProvisioningEnabled,
  );
  const isGoogleWalletProvisioningEnabled = useSelector(
    selectGalileoGoogleWalletProvisioningEnabled,
  );

  // Determine if provisioning is enabled for current platform
  const isPushProvisioningFeatureEnabled =
    Platform.OS === 'ios'
      ? isAppleWalletProvisioningEnabled
      : Platform.OS === 'android'
        ? isGoogleWalletProvisioningEnabled
        : false;

  // Create the adapters based on user location and platform
  const cardAdapter = useMemo(() => {
    if (isSDKLoading) {
      return null;
    }
    if (!cardSDK) {
      return null;
    }

    const adapter = getCardProvider(userCardLocation, cardSDK);
    return adapter;
  }, [cardSDK, userCardLocation, isSDKLoading]);

  const walletAdapter = useMemo(() => {
    const adapter = getWalletProvider();
    return adapter;
  }, []);

  // Check wallet eligibility (async) - includes availability and canAddCard checks
  const [eligibility, setEligibility] = useState<WalletEligibility | null>(
    null,
  );
  const [isEligibilityCheckLoading, setIsEligibilityCheckLoading] =
    useState(true);

  const lastFourDigits = cardDetails?.panLast4;

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
                .addProperties({
                  card_provider_id: cardAdapterProviderIdRef.current,
                  wallet_type: walletAdapterTypeRef.current,
                  token_id: event.tokenId,
                })
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
                .addProperties({
                  card_provider_id: cardAdapterProviderIdRef.current,
                  wallet_type: walletAdapterTypeRef.current,
                  error_code: activationError.code,
                  source: 'activation_listener',
                })
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
            .addProperties({
              card_provider_id: cardAdapter?.providerId,
              wallet_type: walletAdapter?.walletType,
              ...properties,
            })
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
   * Note: Success events are handled by the activation listener (onCardActivated).
   * Cancel and error events are handled here since they come directly from the SDK.
   */
  const initiateProvisioning =
    useCallback(async (): Promise<ProvisioningResult> => {
      setStatus('checking_eligibility');
      setError(null);

      trackAnalyticsEvent(MetaMetricsEvents.CARD_PUSH_PROVISIONING_STARTED);

      if (!cardDetails) {
        setStatus('error');
        setError(
          new ProvisioningError(
            ProvisioningErrorCode.INVALID_CARD_DATA,
            strings('card.push_provisioning.error_invalid_card_data'),
          ),
        );
        return {
          status: 'error',
          error: new ProvisioningError(
            ProvisioningErrorCode.INVALID_CARD_DATA,
            strings('card.push_provisioning.error_invalid_card_data'),
          ),
        };
      }

      try {
        const provisioningOptions: ProvisioningOptions = {
          cardDetails,
          userAddress,
        };

        setStatus('provisioning');
        const result = await service.initiateProvisioning(provisioningOptions);

        // Handle cancel and error - success is handled by the activation listener
        if (result.status === 'canceled') {
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
    }, [cardDetails, userAddress, trackAnalyticsEvent, service]);

  /**
   * Reset status to idle
   */
  const resetStatus = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  // Simplified availability checks
  const isCardProviderAvailable = cardAdapter !== null;
  const isWalletProviderAvailable = walletAdapter !== null;

  const isLoading = isSDKLoading || isEligibilityCheckLoading;

  // Check if card is eligible (status must be 'ACTIVE')
  const isCardEligible = cardDetails?.status === 'ACTIVE';

  const canAddToWallet =
    isPushProvisioningFeatureEnabled &&
    isAuthenticated &&
    !isLoading &&
    !!cardDetails &&
    isCardEligible &&
    isCardProviderAvailable &&
    isWalletProviderAvailable &&
    eligibility?.isAvailable === true &&
    eligibility?.canAddCard === true;

  return {
    status,
    error,
    initiateProvisioning,
    resetStatus,
    isProvisioning:
      status === 'provisioning' || status === 'checking_eligibility',
    isSuccess: status === 'success',
    isError: status === 'error',
    isLoading,
    canAddToWallet,
  };
}
