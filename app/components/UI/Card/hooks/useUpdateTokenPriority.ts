import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useCardSDK } from '../sdk';
import {
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  clearCacheData,
} from '../../../../core/redux/slices/card';
import {
  CardTokenAllowance,
  CardExternalWalletDetailsResponse,
} from '../types';
import Logger from '../../../../util/Logger';

interface UseUpdateTokenPriorityParams {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to update token priority in the card system
 * Handles SDK calls, Redux updates, and cache invalidation
 */
export const useUpdateTokenPriority = (
  params?: UseUpdateTokenPriorityParams,
) => {
  const { sdk } = useCardSDK();
  const dispatch = useDispatch();
  const { onSuccess, onError } = params || {};

  const updateTokenPriority = useCallback(
    async (
      token: CardTokenAllowance,
      externalWalletDetails: CardExternalWalletDetailsResponse,
    ): Promise<boolean> => {
      if (!sdk) {
        const error = new Error('Card SDK not available');
        Logger.error(error, 'useUpdateTokenPriority: SDK not available');
        onError?.(error);
        return false;
      }

      if (!externalWalletDetails || externalWalletDetails.length === 0) {
        const error = new Error('External wallet details not available');
        Logger.error(
          error,
          'useUpdateTokenPriority: External wallet details not available',
        );
        onError?.(error);
        return false;
      }

      try {
        // Find the wallet that matches the selected token
        const selectedWallet = externalWalletDetails.find(
          (wallet) =>
            wallet.tokenDetails.address?.toLowerCase() ===
              token.address?.toLowerCase() &&
            wallet.caipChainId === token.caipChainId &&
            wallet.walletAddress?.toLowerCase() ===
              token.walletAddress?.toLowerCase(),
        );

        if (!selectedWallet) {
          const error = new Error(
            'Selected wallet not found in wallet details',
          );
          Logger.error(
            error,
            'useUpdateTokenPriority: Could not find matching wallet',
          );
          onError?.(error);
          return false;
        }

        // Sort wallets by current priority to maintain order
        const sortedWallets = [...externalWalletDetails].sort(
          (a, b) => a.priority - b.priority,
        );

        // Build new priorities: selected gets 1, others shift down maintaining their order
        let nextPriority = 2;
        const newPriorities = sortedWallets.map((wallet) => {
          const isSelected =
            wallet.id === selectedWallet.id &&
            wallet.walletAddress?.toLowerCase() ===
              selectedWallet.walletAddress?.toLowerCase();

          const priority = isSelected ? 1 : nextPriority++;

          return {
            id: wallet.id,
            priority,
          };
        });

        // Update priority via SDK
        await sdk.updateWalletPriority(newPriorities);

        // Invalidate external wallet details cache to force refetch with updated priorities
        dispatch(clearCacheData('card-external-wallet-details'));

        // Update priority token in Redux with new priority value
        const priorityTokenData: CardTokenAllowance = {
          address: token.address,
          decimals: token.decimals,
          symbol: token.symbol,
          name: token.name,
          allowanceState: token.allowanceState,
          allowance: token.allowance || '0',
          availableBalance: token.availableBalance || '0',
          walletAddress: selectedWallet.walletAddress,
          caipChainId: token.caipChainId,
          delegationContract: token.delegationContract,
          priority: 1, // New priority is always 1 (highest)
          stagingTokenAddress: token.stagingTokenAddress,
        };

        dispatch(setAuthenticatedPriorityToken(priorityTokenData));
        dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));

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
    [sdk, dispatch, onSuccess, onError],
  );

  return {
    updateTokenPriority,
  };
};
