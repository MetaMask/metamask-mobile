import { StakingType, StakeSdk, PooledStakingContract } from '@metamask/stake-sdk';
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
    sdkService?: PooledStakingContract; // to do : facade it for other services implementation

    sdkType?: StakingType;
    setSdkType: (stakeType: StakingType) => void;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
}
export const StakeSDKProvider: React.FC<PropsWithChildren<StakeProviderProps>> = ({
  children,
}) => {
  // from react state
  const [sdkService, setSdkService] = useState<PooledStakingContract>();
  const [sdkError, setSdkError] = useState<Error>();
  const [sdkType, setSdkType] = useState(StakingType.POOLED);

  useEffect(() => {
    (async () => {
      try {
        if (sdkType === StakingType?.POOLED) {
          setSdkService(SDK.pooledStakingContractService);
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
      sdkService,
      sdkType,
      setSdkType,
    }),
    [
      sdkError,
      sdkService,
      sdkType,
      setSdkType,
    ],
  );
  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};