import { StakeSdk, StakingType, ChainId } from '@metamask/stake-sdk';
import { useMemo } from 'react';

const usePoolStakeSdk = (chainId: ChainId) =>
  useMemo(
    () =>
      StakeSdk.create({
        chainId,
        stakingType: StakingType.POOLED,
      }),
    [chainId],
  );

export default usePoolStakeSdk;
