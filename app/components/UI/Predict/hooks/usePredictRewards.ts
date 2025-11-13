import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  toCaipAccountId,
  parseCaipChainId,
  type CaipAccountId,
} from '@metamask/utils';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';

// Polygon mainnet chain ID
const POLYGON_CHAIN_ID = '0x89';

interface UsePredictRewardsResult {
  enabled: boolean;
  isLoading: boolean;
}

/**
 * Formats an address to CAIP-10 account ID for Polygon
 */
const formatAccountToCaipAccountId = (
  address: string,
): CaipAccountId | null => {
  try {
    const caipChainId = formatChainIdToCaip(POLYGON_CHAIN_ID);
    const { namespace, reference } = parseCaipChainId(caipChainId);
    return toCaipAccountId(namespace, reference, address);
  } catch (error) {
    Logger.error(ensureError(error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictRewards',
      },
      context: {
        name: 'usePredictRewards',
        data: {
          method: 'formatAccountToCaipAccountId',
          action: 'caip_formatting',
          operation: 'account_formatting',
        },
      },
    });
    return null;
  }
};

/**
 * Hook to check if rewards are enabled for the current account in Predict
 * @returns {UsePredictRewardsResult} Object containing enabled status and loading state
 */
export const usePredictRewards = (): UsePredictRewardsResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  // Selectors
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const checkRewardsEnabled = useCallback(async () => {
    // Skip if missing required data
    if (!selectedAddress) {
      setEnabled(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Check if rewards feature is enabled globally
      const isRewardsEnabled = Engine.controllerMessenger.call(
        'RewardsController:isRewardsFeatureEnabled',
      );

      if (!isRewardsEnabled) {
        setEnabled(false);
        setIsLoading(false);
        return;
      }

      // Format account to CAIP-10 for Polygon
      const caipAccount = formatAccountToCaipAccountId(selectedAddress);

      if (!caipAccount) {
        setEnabled(false);
        setIsLoading(false);
        return;
      }

      // Check if account has opted in
      const hasOptedIn = await Engine.controllerMessenger.call(
        'RewardsController:getHasAccountOptedIn',
        caipAccount,
      );

      setEnabled(hasOptedIn);
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictRewards',
        },
        context: {
          name: 'usePredictRewards',
          data: {
            method: 'checkRewardsEnabled',
            action: 'rewards_check',
            operation: 'rewards_status',
          },
        },
      });
      setEnabled(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddress]);

  // Check rewards status when dependencies change
  useEffect(() => {
    checkRewardsEnabled();
  }, [checkRewardsEnabled]);

  return {
    enabled,
    isLoading,
  };
};
