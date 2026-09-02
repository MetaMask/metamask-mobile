import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ImpactMoment, playImpact } from '../../../../util/haptics';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsEligibility } from '../selectors/perpsController';
import { usePerpsTrading } from './usePerpsTrading';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import {
  PERPS_CONSTANTS,
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
} from '@metamask/perps-controller';
import { ensureError } from '../../../../util/errorUtils';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { selectPayQuoteConfig } from '../../../../selectors/featureFlagController/confirmations';
import { RootState } from '../../../../reducers';
import { usePerpsWithdrawConfirmation } from './usePerpsWithdrawConfirmation';
import { useComplianceGate } from '../../Compliance';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import {
  createDepositConfirmationGuard,
  createDepositPrepSession,
  type DepositConfirmationNavigation,
  type DepositPrepSession,
} from '../utils/depositConfirmationGuard';

export type PerpsHomeActionType = 'deposit' | 'withdraw';

export interface UsePerpsHomeActionsOptions {
  /** Callback invoked when add funds succeeds */
  onAddFundsSuccess?: () => void;
  /** Callback invoked when withdraw succeeds */
  onWithdrawSuccess?: () => void;
  /** Callback invoked when an error occurs */
  onError?: (error: Error, action: PerpsHomeActionType) => void;
  /** Button location for tracking deposit entry point */
  buttonLocation?: string;
}

export interface UsePerpsHomeActionsReturn {
  /** Whether user is eligible for perps trading */
  isEligible: boolean;
  /** Whether eligibility modal is visible */
  isEligibilityModalVisible: boolean;
  /** Whether an action is currently processing */
  isProcessing: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Handler for add funds button */
  handleAddFunds: () => Promise<void>;
  /** Handler for withdraw button */
  handleWithdraw: () => Promise<void>;
  /**
   * Opens the geo-block eligibility modal and tracks the screen view
   * with the supplied analytics source.
   */
  showEligibilityModal: (source: string) => void;
  /** Close eligibility modal */
  closeEligibilityModal: () => void;
}

/**
 * Hook for managing Perps home screen action business logic
 *
 * Handles:
 * - Eligibility checks and modal display
 * - Network validation (Arbitrum)
 * - Add funds flow: haptic + skeleton immediately, then fire-and-forget deposit prep
 * - Withdraw navigation
 * - Error handling with Sentry tracking
 * - Loading state management
 *
 * @param options - Configuration options for callbacks
 * @returns Home actions state and handlers
 */
export const usePerpsHomeActions = (
  options?: UsePerpsHomeActionsOptions,
): UsePerpsHomeActionsReturn => {
  const navigation = useNavigation<AppNavigationProp>();
  const isEligible = useSelector(selectPerpsEligibility);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const { depositWithConfirmation } = usePerpsTrading();
  const { navigateToConfirmation } = useConfirmNavigation();
  const perpsWithdrawConfig = useSelector((state: RootState) =>
    selectPayQuoteConfig(state, 'perpsWithdraw'),
  );
  const { withdrawWithConfirmation } = usePerpsWithdrawConfirmation();
  const { gate } = useComplianceGate(selectedAddress);

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { track } = usePerpsEventTracking();

  const { onAddFundsSuccess, onWithdrawSuccess, onError, buttonLocation } =
    options || {};
  const depositPrepSessionRef = useRef<DepositPrepSession | null>(null);

  const clearDepositPrepSession = useCallback(() => {
    depositPrepSessionRef.current?.dispose();
    depositPrepSessionRef.current = null;
  }, []);

  useEffect(() => clearDepositPrepSession, [clearDepositPrepSession]);

  const showEligibilityModal = useCallback(
    (source: string) => {
      DevLogger.log('[usePerpsHomeActions] Showing eligibility modal', {
        source,
      });
      track(MetaMetricsEvents.PERPS_SCREEN_VIEWED, {
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.GEO_BLOCK_NOTIF,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
      });
      setIsEligibilityModalVisible(true);
    },
    [track],
  );

  const handleAddFunds = useCallback(() => {
    playImpact(ImpactMoment.PrimaryCTA).catch(() => undefined);

    return gate(async () => {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.DEPOSIT,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          buttonLocation || PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      });

      if (!isEligible) {
        DevLogger.log('[usePerpsHomeActions] User not eligible for deposit');
        showEligibilityModal(PERPS_EVENT_VALUE.SOURCE.DEPOSIT_BUTTON);
        return;
      }

      setError(null);

      DevLogger.log('[usePerpsHomeActions] Starting add funds flow');

      navigateToConfirmation({
        loader: ConfirmationLoader.CustomAmount,
        stack: Routes.PERPS.ROOT,
      });

      if (!depositPrepSessionRef.current) {
        depositPrepSessionRef.current = createDepositPrepSession();
      }
      depositPrepSessionRef.current.attachGuard(
        createDepositConfirmationGuard(
          navigation as unknown as DepositConfirmationNavigation,
        ),
      );
      // Yield so the confirmation skeleton can paint before deposit prep.
      // A second tap reuses this session so stale prep cannot clear the new guard.
      depositPrepSessionRef.current.ensureScheduled(
        () => depositWithConfirmation(),
        {
          onSuccess: () => {
            DevLogger.log(
              '[usePerpsHomeActions] Add funds flow completed successfully',
            );
            depositPrepSessionRef.current = null;
            onAddFundsSuccess?.();
          },
          onFailure: (err) => {
            depositPrepSessionRef.current = null;

            const errorObj = ensureError(
              err,
              'usePerpsHomeActions.handleAddFunds',
            );
            setError(errorObj);

            Logger.error(errorObj, {
              tags: {
                feature: PERPS_CONSTANTS.FeatureName,
              },
            });

            onError?.(errorObj, 'deposit');
          },
        },
      );
    });
  }, [
    gate,
    isEligible,
    navigation,
    navigateToConfirmation,
    depositWithConfirmation,
    onAddFundsSuccess,
    onError,
    track,
    buttonLocation,
    showEligibilityModal,
  ]);

  const handleWithdraw = useCallback(async () => {
    // Track withdrawal button click with geo-block status for monitoring (TAT-2337)
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.WITHDRAW,
      [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
        buttonLocation || PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME,
      [PERPS_EVENT_PROPERTY.IS_GEO_BLOCKED]: !isEligible,
    });

    // Note: Withdrawals are intentionally NOT geo-blocked (TAT-2337)
    // Users in restricted regions can withdraw their funds but cannot deposit or trade
    // We track IS_GEO_BLOCKED property above to monitor geo-blocked withdrawals

    setIsProcessing(true);
    setError(null);

    DevLogger.log('[usePerpsHomeActions] Starting withdraw flow', {
      isGeoBlocked: !isEligible,
    });

    try {
      if (perpsWithdrawConfig.enabled) {
        await withdrawWithConfirmation();
        DevLogger.log(
          '[usePerpsHomeActions] Started withdraw-to-any-token flow',
        );
      } else {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.WITHDRAW,
        });
        DevLogger.log(
          '[usePerpsHomeActions] Navigated to legacy withdraw screen',
        );
      }

      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (err) {
      const errorObj = ensureError(err, 'usePerpsHomeActions.handleWithdraw');
      setError(errorObj);

      Logger.error(errorObj, {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
        },
      });

      if (onError) {
        onError(errorObj, 'withdraw');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    isEligible,
    navigation,
    perpsWithdrawConfig.enabled,
    withdrawWithConfirmation,
    onWithdrawSuccess,
    onError,
    track,
    buttonLocation,
  ]);

  const closeEligibilityModal = useCallback(() => {
    DevLogger.log('[usePerpsHomeActions] Closing eligibility modal');
    setIsEligibilityModalVisible(false);
  }, []);

  return {
    isEligible,
    isEligibilityModalVisible,
    isProcessing,
    error,
    handleAddFunds,
    handleWithdraw,
    showEligibilityModal,
    closeEligibilityModal,
  };
};
