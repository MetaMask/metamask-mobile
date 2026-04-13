import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { CardTokenAllowance } from '../types';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { selectCardHomeData } from '../../../../selectors/cardController';
import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

interface UseUpdateTokenPriorityParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

function tokenAllowanceToFundingAsset(
  token: CardTokenAllowance,
  allAssets: CardFundingAsset[],
): CardFundingAsset | null {
  return (
    allAssets.find(
      (a) =>
        a.walletAddress?.toLowerCase() === token.walletAddress?.toLowerCase() &&
        a.symbol.toLowerCase() === token.symbol?.toLowerCase() &&
        a.chainId === token.caipChainId,
    ) ?? null
  );
}

export const useUpdateTokenPriority = (
  params?: UseUpdateTokenPriorityParams,
) => {
  const cardHomeData = useSelector(selectCardHomeData);
  const { onSuccess, onError } = params || {};

  const updateTokenPriority = useCallback(
    async (
      token: CardTokenAllowance,
      _externalWalletDetails?: unknown,
    ): Promise<boolean> => {
      const allAssets = cardHomeData?.assets ?? [];

      const selectedAsset = tokenAllowanceToFundingAsset(token, allAssets);
      if (!selectedAsset) {
        const error = new Error('Selected token not found in current assets');
        onError?.(error);
        return false;
      }

      try {
        // Controller handles the optimistic update and rollback internally
        await Engine.context.CardController.updateAssetPriority(
          selectedAsset,
          allAssets,
        );
        onSuccess?.();
        return true;
      } catch (error) {
        Logger.error(
          error as Error,
          'useUpdateTokenPriority: Error updating wallet priority',
        );
        onError?.(error as Error);
        return false;
      }
    },
    [cardHomeData, onSuccess, onError],
  );

  return {
    updateTokenPriority,
  };
};
