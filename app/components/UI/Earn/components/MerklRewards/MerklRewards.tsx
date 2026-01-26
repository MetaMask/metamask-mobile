import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import { TokenI } from '../../../Tokens/types';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import PendingMerklRewards from './PendingMerklRewards';
import ClaimMerklRewards from './ClaimMerklRewards';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { fetchEvmAtomicBalance } from '../../../Bridge/hooks/useLatestBalance';
import { getProviderByChainId } from '../../../../../util/notifications/methods/common';

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

  // Update navigation params with new balance, fetching directly from RPC with retry
  const updateAssetBalanceWithRetry = useCallback(async () => {
    if (!selectedAddress || !asset.address || !asset.chainId) return;

    // Use current displayed balance as baseline for comparison
    const initialBalance = asset.balance;
    const maxRetries = 5;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Fetch balance directly from RPC (bypasses controller cache)
      const web3Provider = getProviderByChainId(asset.chainId as Hex);
      const atomicBalance = await fetchEvmAtomicBalance(
        web3Provider,
        selectedAddress,
        asset.address,
        asset.chainId as Hex,
      );

      if (atomicBalance) {
        const newBalance = formatUnits(atomicBalance, asset.decimals ?? 18);

        // Strip commas from initial balance (e.g., "5,000" -> "5000") before comparing
        const initialValue = parseFloat(
          (initialBalance ?? '0').replace(/,/g, ''),
        );
        const newValue = parseFloat(newBalance);

        // Check if balance actually changed
        if (newValue !== initialValue) {
          // Update route params directly - asset IS route.params in Asset/index.js
          navigation.setParams({
            balance: newBalance,
          } as never);
          return;
        }
      }
    }
  }, [selectedAddress, asset, navigation]);

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
