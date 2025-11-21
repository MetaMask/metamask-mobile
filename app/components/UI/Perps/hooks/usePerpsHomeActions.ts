import { useCallback, useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsEligibility } from '../selectors/perpsController';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetworkManagement } from './usePerpsNetworkManagement';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import type { PerpsNavigationParamList } from '../controllers/types';
import { ensureError } from '../utils/perpsErrorHandler';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export type PerpsHomeActionType = 'deposit' | 'withdraw';

export interface UsePerpsHomeActionsOptions {
  /** Callback invoked when add funds succeeds */
  onAddFundsSuccess?: () => void;
  /** Callback invoked when withdraw succeeds */
  onWithdrawSuccess?: () => void;
  /** Callback invoked when an error occurs */
  onError?: (error: Error, action: PerpsHomeActionType) => void;
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
  /** Close eligibility modal */
  closeEligibilityModal: () => void;
}

/**
 * Hook for managing Perps home screen action business logic
 *
 * Handles:
 * - Eligibility checks and modal display
 * - Network validation (Arbitrum)
 * - Add funds flow with confirmation navigation
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
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const isEligible = useSelector(selectPerpsEligibility);
  const { depositWithConfirmation } = usePerpsTrading();
  const { ensureArbitrumNetworkExists } = usePerpsNetworkManagement();
  const { navigateToConfirmation } = useConfirmNavigation();

  const [isEligibilityModalVisible, setIsEligibilityModalVisible] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onAddFundsSuccess, onWithdrawSuccess, onError } = options || {};

  const handleAddFunds = useCallback(async () => {
    if (!isEligible) {
      DevLogger.log('[usePerpsHomeActions] User not eligible for deposit');
      setIsEligibilityModalVisible(true);
      return;
    }

    setIsProcessing(true);
    setError(null);

    DevLogger.log('[usePerpsHomeActions] Starting add funds flow');

    try {
      await ensureArbitrumNetworkExists();
      navigateToConfirmation({ stack: Routes.PERPS.ROOT });

      // Wait for deposit confirmation to complete before calling success callback
      await depositWithConfirmation();

      DevLogger.log(
        '[usePerpsHomeActions] Add funds flow completed successfully',
      );

      if (onAddFundsSuccess) {
        onAddFundsSuccess();
      }
    } catch (err) {
      const errorObj = ensureError(err);
      setError(errorObj);

      Logger.error(errorObj, {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
        },
      });

      if (onError) {
        onError(errorObj, 'deposit');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    isEligible,
    ensureArbitrumNetworkExists,
    navigateToConfirmation,
    depositWithConfirmation,
    onAddFundsSuccess,
    onError,
  ]);

  const handleWithdraw = useCallback(async () => {
    if (!isEligible) {
      DevLogger.log('[usePerpsHomeActions] User not eligible for withdraw');
      setIsEligibilityModalVisible(true);
      return;
    }

    setIsProcessing(true);
    setError(null);

    DevLogger.log('[usePerpsHomeActions] Starting withdraw flow');

    try {
      await ensureArbitrumNetworkExists();
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });

      DevLogger.log('[usePerpsHomeActions] Navigated to withdraw screen');

      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (err) {
      const errorObj = ensureError(err);
      setError(errorObj);

      Logger.error(errorObj, {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
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
    ensureArbitrumNetworkExists,
    navigation,
    onWithdrawSuccess,
    onError,
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
    closeEligibilityModal,
  };
};
