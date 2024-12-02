import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  type StakingApiService,
  isSupportedChain,
} from '@metamask/stake-sdk';
import React, {
  useState,
  createContext,
  useMemo,
  PropsWithChildren,
} from 'react';
import { getProviderByChainId } from '../../../../util/notifications';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';

export const SDK = StakeSdk.create({ stakingType: StakingType.POOLED });

export interface Stake {
  stakingContract?: PooledStakingContract;
  stakingApiService?: StakingApiService;
  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
}
export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children }) => {
  const [sdkType, setSdkType] = useState(StakingType.POOLED);

  const chainId = useSelector(selectChainId);

  const sdkService = useMemo(() => {
    if (!chainId || !isSupportedChain(getDecimalChainId(chainId))) {
      console.error(
        'Failed to initialize Staking SDK Service: chainId unsupported',
      );
      return;
    }

    const provider = getProviderByChainId(chainId);

    if (!provider) {
      console.error(
        'Failed to initialize Staking SDK Service: provider not found',
      );
      return;
    }

    const sdk = StakeSdk.create({
      chainId: getDecimalChainId(chainId),
      stakingType: sdkType,
    });

    sdk.pooledStakingContract.connectSignerOrProvider(provider);

    return sdk;
  }, [chainId, sdkType]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      stakingContract: sdkService?.pooledStakingContract,
      stakingApiService: sdkService?.stakingApiService,
      sdkType,
      setSdkType,
    }),
    [sdkService?.pooledStakingContract, sdkService?.stakingApiService, sdkType],
  );
  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
