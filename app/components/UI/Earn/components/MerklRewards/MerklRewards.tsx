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
}

/**
 * Main component to display Merkl rewards information and claim functionality
 * Handles eligibility checking and reward data fetching internally
 */
const MerklRewards: React.FC<MerklRewardsProps> = ({ asset }) => {
  const isEligible = isEligibleForMerklRewards(
    asset.chainId as Hex,
    asset.address as Hex | undefined,
  );

  // Fetch claimable rewards data
  const { claimableReward } = useMerklRewards({ asset });

  if (!isEligible) {
    return null;
  }

  return (
    <>
      <PendingMerklRewards claimableReward={claimableReward} />
      {claimableReward && <ClaimMerklRewards asset={asset} />}
    </>
  );
};

export default MerklRewards;
