import React, { useEffect } from 'react';
import { TokenI } from '../../../../Tokens/types';
import { useMerklRewards } from './useMerklRewards';
import { usePendingMerklClaim } from './usePendingMerklClaim';
import { useMerklClaim } from './useMerklClaim';

export interface MerklClaimData {
  claimableReward: string | null;
  hasPendingClaim: boolean;
  isClaiming: boolean;
  claimRewards: () => Promise<
    | {
        txHash: string;
        transactionMeta: Record<string, unknown>;
      }
    | undefined
  >;
}

export const DEFAULT_MERKL_CLAIM_DATA: MerklClaimData = {
  claimableReward: null,
  hasPendingClaim: false,
  isClaiming: false,
  claimRewards: async () => undefined,
};

interface MerklClaimHandlerProps {
  asset: TokenI | undefined;
  onDataChange: (data: MerklClaimData) => void;
}

/**
 * Headless component that manages Merkl claim hooks and syncs state to parent.
 * Only mount this for tokens eligible for Merkl rewards to avoid unnecessary
 * hook overhead for non-eligible tokens.
 *
 * Renders null — no visual output.
 */
export const MerklClaimHandler = React.memo(
  ({ asset, onDataChange }: MerklClaimHandlerProps) => {
    const { claimableReward } = useMerklRewards({ asset });
    const { hasPendingClaim } = usePendingMerklClaim();
    const { claimRewards, isClaiming } = useMerklClaim(asset);

    useEffect(() => {
      onDataChange({
        claimableReward,
        hasPendingClaim,
        claimRewards,
        isClaiming,
      });
    }, [
      claimableReward,
      hasPendingClaim,
      claimRewards,
      isClaiming,
      onDataChange,
    ]);

    return null;
  },
);

MerklClaimHandler.displayName = 'MerklClaimHandler';
