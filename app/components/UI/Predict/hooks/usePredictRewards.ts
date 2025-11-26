import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  toCaipAccountId,
  parseCaipChainId,
  type CaipAccountId,
} from '@metamask/utils';
import {
  EstimatePointsDto,
  EstimatedPointsDto,
  EstimateAssetDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import {
  POLYGON_MAINNET_CAIP_CHAIN_ID,
  POLYGON_USDC_CAIP_ASSET_ID,
  COLLATERAL_TOKEN_DECIMALS,
} from '../providers/polymarket/constants';
import { parseUnits } from 'ethers/lib/utils';
import Logger from '../../../../util/Logger';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface UsePredictRewardsResult {
  enabled: boolean;
  isLoading: boolean;
  accountOptedIn: boolean | null;
  rewardsAccountScope: InternalAccount | null;
  shouldShowRewardsRow: boolean;
  estimatedPoints: number | null;
  hasError: boolean;
}

/**
 * Formats an address to CAIP-10 account ID for Polygon
 */
const formatAccountToCaipAccountId = (
  address: string,
): CaipAccountId | null => {
  try {
    const { namespace, reference } = parseCaipChainId(
      POLYGON_MAINNET_CAIP_CHAIN_ID,
    );
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
 * Hook to check if rewards are enabled for the current account in Predict and estimate points
 * @param totalFeeAmountUsd - Total fee amount in USD
 * @returns {UsePredictRewardsResult} Object containing enabled status, loading state, and estimated points
 */
export const usePredictRewards = (
  totalFeeAmountUsd?: number,
): UsePredictRewardsResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [accountOptedIn, setAccountOptedIn] = useState<boolean | null>(null);
  const [estimatedPoints, setEstimatedPoints] = useState<number | null>(null);
  const [shouldShowRewardsRow, setShouldShowRewardsRow] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Selectors
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const selectedAccount = getSelectedAccountByScope(
    POLYGON_MAINNET_CAIP_CHAIN_ID,
  );
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : undefined;

  const estimatePoints = useCallback(async () => {
    // Skip if missing required data
    if (!selectedAddress || !selectedAccount || !totalFeeAmountUsd) {
      setEstimatedPoints(null);
      setEnabled(false);
      setAccountOptedIn(null);
      setShouldShowRewardsRow(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      // Check if there is an active season
      const hasActiveSeason = await Engine.controllerMessenger.call(
        'RewardsController:hasActiveSeason',
      );

      if (!hasActiveSeason) {
        setEstimatedPoints(null);
        setEnabled(false);
        setShouldShowRewardsRow(false);
        setAccountOptedIn(null);
        setIsLoading(false);
        return;
      }

      // Check if there's a subscription first
      const candidateSubscriptionId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );

      if (!candidateSubscriptionId) {
        setEstimatedPoints(null);
        setEnabled(false);
        setShouldShowRewardsRow(false);
        setAccountOptedIn(null);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      // Format account to CAIP-10 for Polygon
      const caipAccount = formatAccountToCaipAccountId(selectedAddress);
      if (!caipAccount) {
        setEstimatedPoints(null);
        setEnabled(false);
        setShouldShowRewardsRow(false);
        setAccountOptedIn(null);
        setIsLoading(false);
        return;
      }

      // Check if account has opted in
      const hasOptedIn = await Engine.controllerMessenger.call(
        'RewardsController:getHasAccountOptedIn',
        caipAccount,
      );

      setAccountOptedIn(hasOptedIn);

      // Determine if we should show the rewards row
      // Show row if: opted in OR (not opted in AND opt-in is supported)
      let shouldShow = hasOptedIn;

      if (!hasOptedIn && selectedAccount) {
        const isOptInSupported = await Engine.controllerMessenger.call(
          'RewardsController:isOptInSupported',
          selectedAccount,
        );
        shouldShow = isOptInSupported;
      }

      setShouldShowRewardsRow(shouldShow);
      setEnabled(shouldShow);

      // Only estimate points if account is opted in and fee asset info is provided
      if (!hasOptedIn) {
        setEstimatedPoints(null);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      // If fee asset information is not provided, skip estimation
      if (!totalFeeAmountUsd) {
        setEstimatedPoints(null);
        setHasError(false);
        setIsLoading(false);
        return;
      }

      // Prepare fee asset
      // Convert USD amount to atomic units (6 decimals for USDC)
      const feeAsset: EstimateAssetDto = {
        id: POLYGON_USDC_CAIP_ASSET_ID,
        amount: parseUnits(
          totalFeeAmountUsd.toString(),
          COLLATERAL_TOKEN_DECIMALS,
        ).toString(),
      };

      // Create estimate request
      const estimateRequest: EstimatePointsDto = {
        activityType: 'PREDICT',
        account: caipAccount,
        activityContext: {
          predictContext: {
            feeAsset,
          },
        },
      };

      // Call rewards controller to estimate points
      const result: EstimatedPointsDto = await Engine.controllerMessenger.call(
        'RewardsController:estimatePoints',
        estimateRequest,
      );

      setEstimatedPoints(result.pointsEstimate);
    } catch (error) {
      Logger.error(ensureError(error), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictRewards',
        },
        context: {
          name: 'usePredictRewards',
          data: {
            method: 'estimatePoints',
            action: 'rewards_estimation',
            operation: 'points_estimation',
          },
        },
      });
      setEstimatedPoints(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [totalFeeAmountUsd, selectedAddress, selectedAccount]);

  // Estimate points when dependencies change
  useEffect(() => {
    estimatePoints();
  }, [estimatePoints]);

  // Subscribe to account linked event to retrigger estimate
  useEffect(() => {
    const handleAccountLinked = () => {
      estimatePoints();
    };

    Engine.controllerMessenger.subscribe(
      'RewardsController:accountLinked',
      handleAccountLinked,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:accountLinked',
        handleAccountLinked,
      );
    };
  }, [estimatePoints]);

  return {
    enabled,
    isLoading,
    accountOptedIn,
    rewardsAccountScope: selectedAccount ?? null,
    shouldShowRewardsRow,
    estimatedPoints,
    hasError,
  };
};
