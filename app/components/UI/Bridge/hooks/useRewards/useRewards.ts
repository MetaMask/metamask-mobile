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
  isLoading: boolean;
  estimatedPoints: number | null;
}

/**
 * Formats a token to CAIP-19 asset ID format
 */
const formatTokenToCaipAssetId = (
  chainId: string,
  tokenAddress?: string,
): string | null => {
  try {
    const caipChainId = formatChainIdToCaip(chainId);
    // Native token
    if (
      !tokenAddress ||
      tokenAddress === '0x0000000000000000000000000000000000000000'
    ) {
      return `${caipChainId}/slip44:60`; // ETH native token
    }
    // ERC20 token
    return `${caipChainId}/erc20:${tokenAddress.toLowerCase()}`;
  } catch (error) {
    Logger.error(
      error as Error,
      'useRewards: Error formatting token to CAIP asset ID',
    );
    return null;
  }
};

/**
 * Formats an Ethereum address to CAIP-10 account ID
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

    try {
      // Check if rewards feature is enabled
      // const isRewardsEnabled = await Engine.controllerMessenger.call(
      //   'RewardsController:isRewardsFeatureEnabled',
      // );
      const isRewardsEnabled = true; // TODO remove this

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
      // const hasOptedIn = await Engine.controllerMessenger.call(
      //   'RewardsController:getHasAccountOptedIn',
      //   caipAccount,
      // );
      const hasOptedIn = true; // TODO remove this once Rewards team implements the button in the UI

      if (!hasOptedIn) {
        setEstimatedPoints(null);
        setIsLoading(false);
        return;
      }

      // Format source asset
      const srcAssetId = formatTokenToCaipAssetId(
        sourceToken.chainId,
        sourceToken.address,
      );

      // Format destination asset
      const destAssetId = formatTokenToCaipAssetId(
        destToken.chainId,
        destToken.address,
      );

      if (!srcAssetId || !destAssetId) {
        setEstimatedPoints(null);
        setIsLoading(false);
        return;
      }

      // Convert source amount to atomic unit
      const atomicSourceAmount = activeQuote.quote.srcTokenAmount;

      // Get destination amount from quote
      const atomicDestAmount = activeQuote.quote.destTokenAmount;

      // Prepare source asset
      const srcAsset: EstimateAssetDto = {
        id: srcAssetId,
        amount: atomicSourceAmount,
      };

      // Prepare destination asset
      const destAsset: EstimateAssetDto = {
        id: destAssetId,
        amount: atomicDestAmount,
      };

      // Prepare fee asset (using MetaMask fee from quote data)
      const feeAsset: EstimateAssetDto = {
        id: srcAssetId,
        amount: activeQuote.quote.feeData.metabridge.amount || '0',
        usdPrice: sourceToken.currencyExchangeRate?.toString(),
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
    isLoading: isLoading || isQuoteLoading,
    estimatedPoints,
  };
};
