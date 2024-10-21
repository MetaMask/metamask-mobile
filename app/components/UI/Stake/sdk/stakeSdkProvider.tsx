import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  type StakingApiService,
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
import { hexToDecimal } from '../../../../util/conversions';

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
    const provider = getProviderByChainId(chainId);

    const sdk = StakeSdk.create({
      chainId: parseInt(hexToDecimal(chainId).toString()),
      stakingType: sdkType,
    });

    sdk.pooledStakingContract.connectSignerOrProvider(provider);

    return sdk;
  }, [chainId, sdkType]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      stakingContract: sdkService.pooledStakingContract,
      stakingApiService: sdkService.stakingApiService,
      sdkType,
      setSdkType,
    }),
    [sdkService.pooledStakingContract, sdkService.stakingApiService, sdkType],
  );
  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
