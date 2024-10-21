import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  StakingApiService,
} from '@metamask/stake-sdk';
import Logger from '../../../../util/Logger';
import React, {
  useState,
  useEffect,
  createContext,
  useMemo,
  PropsWithChildren,
} from 'react';
import { Provider } from '@ethersproject/providers';

export const SDK = StakeSdk.create({ stakingType: StakingType.POOLED });

export interface Stake {
  sdkError?: Error;
  onChainService?: PooledStakingContract; // to do : facade it for other services implementation
  offChainService?: StakingApiService; // to do : facade it for other services implementation

  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
  provider?: Provider;
}
export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children, stakingType, provider }) => {
  const [onChainService, setOnChainService] = useState<PooledStakingContract>();
  const [offChainService, setOffChainService] = useState<StakingApiService>();
  const [sdkError, setSdkError] = useState<Error>();
  const [sdkType, setSdkType] = useState(stakingType ?? StakingType.POOLED);

  useEffect(() => {
    (async () => {
      try {
        if (sdkType === StakingType?.POOLED) {
          setOnChainService(SDK.pooledStakingContract);
          setOffChainService(SDK.stakingApiService);
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

  useEffect(() => {
    if (!onChainService || !provider) {
      return;
    }
    onChainService.connectSignerOrProvider(provider);
  }, [onChainService, provider]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      sdkError,
      onChainService,
      offChainService,
      sdkType,
      setSdkType,
    }),
    [sdkError, onChainService, offChainService, sdkType, setSdkType],
  );
  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
