import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import PendingMerklRewards from './PendingMerklRewards';
import ClaimMerklRewards from './ClaimMerklRewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import Engine from '../../../../../core/Engine';

interface MerklRewardsProps {
  asset: TokenI;
}

/**
 * Main component to display Merkl rewards information and claim functionality
 * Handles eligibility checking and reward data fetching internally
 */
const MerklRewards: React.FC<MerklRewardsProps> = ({ asset }) => {
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const isEligible = isEligibleForMerklRewards(
    asset.chainId as Hex,
    asset.address as Hex | undefined,
  );

  // Fetch claimable rewards data
  const { claimableReward, isProcessingClaim, clearReward, refetchWithRetry } =
    useMerklRewards({
      asset,
    });

  // Helper to get current balance from Engine state (avoids closure issues)
  const getCurrentBalanceHex = useCallback(() => {
    if (!selectedAddress || !asset.address) return undefined;

    const tokenBalances =
      Engine.context.TokenBalancesController?.state?.tokenBalances;
    if (!tokenBalances) return undefined;

    // TokenBalancesController stores keys in lowercase
    const addressLower = selectedAddress.toLowerCase() as Hex;
    const accountBalances = tokenBalances[addressLower];
    if (!accountBalances) return undefined;

    const chainBalances = accountBalances[asset.chainId as Hex];
    if (!chainBalances) return undefined;

    // Token address might also need lowercase lookup
    const tokenAddressLower = asset.address.toLowerCase() as Hex;
    return (
      chainBalances[asset.address as Hex] ?? chainBalances[tokenAddressLower]
    );
  }, [selectedAddress, asset.address, asset.chainId]);

  // Update navigation params with new balance, retrying until it changes
  const updateAssetBalanceWithRetry = useCallback(async () => {
    if (!selectedAddress || !asset.address) return;

    const initialBalanceHex = getCurrentBalanceHex();
    const maxRetries = 5;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Refresh balances from blockchain
      const { TokenBalancesController } = Engine.context;
      await TokenBalancesController?.updateBalances({
        chainIds: [asset.chainId as Hex],
      });

      const newBalanceHex = getCurrentBalanceHex();

      // Check if balance actually changed
      if (newBalanceHex && newBalanceHex !== initialBalanceHex) {
        const newBalance = renderFromTokenMinimalUnit(
          newBalanceHex,
          asset.decimals ?? 18,
        );

        // Update route params directly - asset IS route.params in Asset/index.js
        navigation.setParams({
          balance: newBalance,
        } as never);
        return;
      }
    }
  }, [selectedAddress, asset, navigation, getCurrentBalanceHex]);

  // Handler for successful claim - optimistically clear and refetch with retry
  const handleClaimSuccess = useCallback(() => {
    // Immediately clear the reward (optimistic update)
    clearReward();
    // Start retry-based refetch in background to verify claim
    refetchWithRetry({ maxRetries: 5, delayMs: 3000 });
    // Also start balance update retry (runs in parallel)
    updateAssetBalanceWithRetry();
  }, [clearReward, refetchWithRetry, updateAssetBalanceWithRetry]);

  if (!isEligible) {
    return null;
  }

  return (
    <>
      <PendingMerklRewards
        asset={asset}
        claimableReward={claimableReward}
        isProcessingClaim={isProcessingClaim}
      />
      {claimableReward && (
        <ClaimMerklRewards asset={asset} onClaimSuccess={handleClaimSuccess} />
      )}
    </>
  );
};

export default MerklRewards;
