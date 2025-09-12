import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import {
  EstimatePointsDto,
  EstimatedPointsDto,
  EstimateAssetDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
} from '../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectChainId } from '../../../../../selectors/networkController';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  toCaipAccountId,
  parseCaipChainId,
  type CaipAccountId,
} from '@metamask/utils';
import { useBridgeQuoteData } from '../useBridgeQuoteData';
import Logger from '../../../../../util/Logger';

interface UseRewardsParams {
  activeQuote: ReturnType<typeof useBridgeQuoteData>['activeQuote'];
  isQuoteLoading: boolean;
}

interface UseRewardsResult {
  shouldShowRewardsRow: boolean;
  isLoading: boolean;
  estimatedPoints: number | null;
  hasError: boolean;
}

/**
 * Formats an address to CAIP-10 account ID
 */
const formatAccountToCaipAccountId = (
  address: string,
  chainId: string,
): CaipAccountId | null => {
  try {
    const caipChainId = formatChainIdToCaip(chainId);
    const { namespace, reference } = parseCaipChainId(caipChainId);
    return toCaipAccountId(namespace, reference, address);
  } catch (error) {
    Logger.error(
      error as Error,
      'useRewards: Error formatting account to CAIP-10',
    );
    return null;
  }
};

export const useRewards = ({
  activeQuote,
  isQuoteLoading,
}: UseRewardsParams): UseRewardsResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedPoints, setEstimatedPoints] = useState<number | null>(null);
  const [shouldShowRewardsRow, setShouldShowRewardsRow] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Selectors
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const currentChainId = useSelector(selectChainId);

  const estimatePoints = useCallback(async () => {
    // Skip if no active quote or missing required data
    if (
      !activeQuote?.quote ||
      !sourceToken ||
      !destToken ||
      !sourceAmount ||
      !selectedAddress ||
      !currentChainId
    ) {
      setEstimatedPoints(null);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      // Check if rewards feature is enabled
      const isRewardsEnabled = await Engine.controllerMessenger.call(
        'RewardsController:isRewardsFeatureEnabled',
      );

      if (!isRewardsEnabled) {
        setEstimatedPoints(null);
        setIsLoading(false);
        return;
      }

      // Format account to CAIP-10
      const caipAccount = formatAccountToCaipAccountId(
        selectedAddress,
        currentChainId,
      );

      if (!caipAccount) {
        setEstimatedPoints(null);
        setIsLoading(false);
        return;
      }

      // Check if account has opted in
      const hasOptedIn = await Engine.controllerMessenger.call(
        'RewardsController:getHasAccountOptedIn',
        caipAccount,
      );

      if (!hasOptedIn) {
        setEstimatedPoints(null);
        setIsLoading(false);
        return;
      }

      setShouldShowRewardsRow(true);

      // Convert source amount to atomic unit
      const atomicSourceAmount = activeQuote.quote.srcTokenAmount;

      // Get destination amount from quote
      const atomicDestAmount = activeQuote.quote.destTokenAmount;

      // Prepare source asset
      const srcAsset: EstimateAssetDto = {
        id: activeQuote.quote.srcAsset.assetId,
        amount: atomicSourceAmount,
      };

      // Prepare destination asset
      const destAsset: EstimateAssetDto = {
        id: activeQuote.quote.destAsset.assetId,
        amount: atomicDestAmount,
      };

      // Prepare fee asset (using MetaMask fee from quote data)
      const feeAsset: EstimateAssetDto = {
        id: activeQuote.quote.feeData.metabridge.asset.assetId,
        amount: activeQuote.quote.feeData.metabridge.amount || '0',
        // usdPrice: sourceToken.currencyExchangeRate?.toString(), // TODO add this once we get it from backend
      };

      // Create estimate request
      const estimateRequest: EstimatePointsDto = {
        activityType: 'SWAP',
        account: caipAccount,
        activityContext: {
          swapContext: {
            srcAsset,
            destAsset,
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
      Logger.error(error as Error, 'useRewards: Error estimating points');
      setEstimatedPoints(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeQuote,
    sourceToken,
    destToken,
    sourceAmount,
    selectedAddress,
    currentChainId,
  ]);

  // Estimate points when dependencies change
  useEffect(() => {
    estimatePoints();
  }, [
    estimatePoints,
    // Only re-estimate when quote changes (not during loading)
    activeQuote?.quote?.requestId,
  ]);

  return {
    shouldShowRewardsRow,
    isLoading: isLoading || isQuoteLoading,
    estimatedPoints,
    hasError,
  };
};
