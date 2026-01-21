import React from 'react';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';
import {
  isEligibleForMerklRewards,
  useMerklRewards,
} from './hooks/useMerklRewards';
import PendingMerklRewards from './PendingMerklRewards';
import ClaimMerklRewards from './ClaimMerklRewards';

interface MerklRewardsProps {
  asset: TokenI;
  exchangeRate?: number;
}

/**
 * Main component to display Merkl rewards information and claim functionality
 * Handles eligibility checking and reward data fetching internally
 */
const MerklRewards: React.FC<MerklRewardsProps> = ({
  asset,
  exchangeRate: _exchangeRate,
}) => {
  const isEligible = isEligibleForMerklRewards(
    asset.chainId as Hex,
    asset.address as Hex | undefined,
  );

  // Fetch claimable rewards data
  const { claimableReward, refetch } = useMerklRewards({
    asset,
  });

  if (!isEligible) {
    return null;
  }

  return (
    <>
      <PendingMerklRewards asset={asset} claimableReward={claimableReward} />
      {claimableReward && (
        <ClaimMerklRewards asset={asset} onRefetch={refetch} />
      )}
    </>
  );
};

export default MerklRewards;
