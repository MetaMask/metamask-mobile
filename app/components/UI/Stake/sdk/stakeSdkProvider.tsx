import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  type StakingApiService,
} from '@metamask/stake-sdk';
import Logger from '../../../../util/Logger';
import React, {
  useState,
  useEffect,
  createContext,
  useMemo,
  PropsWithChildren,
} from 'react';

export const SDK = StakeSdk.create({ stakingType: StakingType.POOLED });

export interface Stake {
  sdkError?: Error;
  stakingContract?: PooledStakingContract;
  stakingApiService?: StakingApiService;
  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
}

export const StakeContext = StakeSdk.create({ stakingType: StakingType.POOLED });

export interface StakeProviderProps {
  stakingType?: StakingType;
}
export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children }) => {
  const [stakingContract, setStakingContract] =
    useState<PooledStakingContract>();
  const [stakingApiService, setStakingApiService] =
    useState<StakingApiService>();

  const [sdkError, setSdkError] = useState<Error>();
  const [sdkType, setSdkType] = useState(StakingType.POOLED);

  useEffect(() => {
    (async () => {
      try {
        setStakingApiService(SDK.stakingApiService);
        if (sdkType === StakingType?.POOLED) {
          setStakingContract(SDK.pooledStakingContract);
        } else {
          const notImplementedError = new Error(
            `StakeSDKProvider SDK.StakingType ${sdkType} not implemented yet`,
          );
          Logger.error(notImplementedError);
          setSdkError(notImplementedError);
        }
      } catch (error) {
        Logger.error(error as Error, `StakeSDKProvider SDK.service failed`);
        setSdkError(error as Error);
      }
    })();
  }, [sdkType]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      sdkError,
      stakingContract,
      sdkType,
      setSdkType,
      stakingApiService,
    }),
    [sdkError, stakingContract, sdkType, stakingApiService],
  );

  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
