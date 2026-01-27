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
} from '../types';
import { createPushProvisioningService, ProvisioningOptions } from '../service';
import { getCardProvider, getWalletProvider } from '../providers';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useMetrics } from '../../../../hooks/useMetrics';
import { useCardSDK } from '../../sdk';
import { selectUserCardLocation } from '../../../../../core/redux/slices/card';
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
 *   cardId: 'card-123',
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
  const { cardId, lastFourDigits, onSuccess, onError, onCancel } = options;

  const [status, setStatus] = useState<ProvisioningStatus>('idle');
  const [error, setError] = useState<ProvisioningError | null>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  // Get SDK and user location
  const { sdk: cardSDK, isLoading: isSDKLoading } = useCardSDK();
  const userCardLocation = useSelector(selectUserCardLocation);

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

  useEffect(() => {
    let isMounted = true;

    const checkEligibility = async () => {
      setIsEligibilityCheckLoading(true);

      if (!walletAdapter) {
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

  // Create service with adapters
  const service = useMemo(
    () => createPushProvisioningService(cardAdapter, walletAdapter, __DEV__),
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

  // Set up activation listener
  useEffect(() => {
    const unsubscribe = service.addActivationListener(
      (event: CardActivationEvent) => {
        if (event.status === 'activated') {
          setStatus('success');
          onSuccessRef.current?.({
            status: 'success',
            tokenId: event.tokenId,
          });
        } else if (event.status === 'canceled') {
          setStatus('idle');
          onCancelRef.current?.();
        } else if (event.status === 'failed') {
          setStatus('error');
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
              ...properties,
            })
            .build(),
        );
      } catch {
        // Silently ignore analytics errors
      }
    },
    [cardAdapter?.providerId, trackEvent, createEventBuilder],
  );

  /**
   * Initiate provisioning
   */
  const initiateProvisioning =
    useCallback(async (): Promise<ProvisioningResult> => {
      setStatus('checking_eligibility');
      setError(null);

      trackAnalyticsEvent(MetaMetricsEvents.CARD_PUSH_PROVISIONING_STARTED);

      try {
        const provisioningOptions: ProvisioningOptions = {
          cardId,
          enableLogs: __DEV__,
        };

        setStatus('provisioning');
        const result = await service.initiateProvisioning(provisioningOptions);

        if (result.status === 'success') {
          setStatus('success');
          trackAnalyticsEvent(
            MetaMetricsEvents.CARD_PUSH_PROVISIONING_COMPLETED,
            {
              token_id: result.tokenId,
            },
          );
          onSuccessRef.current?.(result);
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
            error_message: result.error?.message,
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
          error_message: provisioningError.message,
        });

        onErrorRef.current?.(provisioningError);

        return {
          status: 'error',
          error: provisioningError,
        };
      }
    }, [cardId, trackAnalyticsEvent, service]);

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

  const canAddToWallet =
    !isLoading &&
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
