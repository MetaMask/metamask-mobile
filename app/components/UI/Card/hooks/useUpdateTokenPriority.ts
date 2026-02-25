import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import {
  CardTokenAllowance,
  CardExternalWalletDetailsResponse,
} from '../types';
import Logger from '../../../../util/Logger';
import { cardKeys } from '../queries';

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
  const queryClient = useQueryClient();
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

        // Invalidate external wallet details cache to force refetch with updated priorities.
        // The priority token is derived from this data via React Query.
        await queryClient.invalidateQueries({
          queryKey: cardKeys.externalWalletDetails(),
        });

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
    [sdk, queryClient, onSuccess, onError],
  );

  return {
    updateTokenPriority,
  };
};
