import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { CardFundingToken } from '../types';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { selectCardHomeData } from '../../../../selectors/cardController';
import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

interface UseUpdateFundingPriorityParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

function findFundingAsset(
  token: CardFundingToken,
  fundingAssets: CardFundingAsset[],
): CardFundingAsset | null {
  return (
    fundingAssets.find(
      (a) =>
        a.walletAddress?.toLowerCase() === token.walletAddress?.toLowerCase() &&
        a.symbol.toLowerCase() === token.symbol?.toLowerCase() &&
        a.chainId === token.caipChainId,
    ) ?? null
  );
}

export const useUpdateFundingPriority = (
  params?: UseUpdateFundingPriorityParams,
) => {
  const cardHomeData = useSelector(selectCardHomeData);
  const queryClient = useQueryClient();
  const { onSuccess, onError } = params || {};

  const updateFundingPriority = useCallback(
    async (
      token: CardFundingToken,
      _externalWalletDetails?: unknown,
    ): Promise<boolean> => {
      const fundingAssets = cardHomeData?.fundingAssets ?? [];

      const selectedAsset = findFundingAsset(token, fundingAssets);
      if (!selectedAsset) {
        const error = new Error(
          'Selected token not found in current funding assets',
        );
        onError?.(error);
        return false;
      }

      try {
        await Engine.context.CardController.updateAssetPriority(
          selectedAsset,
          fundingAssets,
        );
        queryClient.invalidateQueries({ queryKey: ['card', 'home'] });
        onSuccess?.();
        return true;
      } catch (error) {
        Logger.error(
          error as Error,
          'useUpdateFundingPriority: Error updating funding priority',
        );
        onError?.(error as Error);
        return false;
      }
    },
    [cardHomeData, queryClient, onSuccess, onError],
  );

  return {
    updateFundingPriority,
  };
};
