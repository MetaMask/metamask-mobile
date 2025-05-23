import {
  StakingType,
  EarnSdk,
  PooledStakingContract,
  isSupportedChain,
  PooledStakingApiService,
} from '@metamask/stake-sdk';
import React, {
  useState,
  createContext,
  useEffect,
  PropsWithChildren,
} from 'react';
import { getProviderByChainId } from '../../../../util/notifications';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectNetworkClientId,
} from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import trackErrorAsAnalytics from '../../../../util/metrics/TrackError/trackErrorAsAnalytics';

export const pooledStakingApiService = new PooledStakingApiService();

export interface Stake {
  stakingContract?: PooledStakingContract;
  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
  networkClientId?: string;
  error?: string;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
}

export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children }) => {
  const [sdkType, setSdkType] = useState(StakingType.POOLED);
  const [sdk, setSdk] = useState<EarnSdk | undefined>();
  const [error, setError] = useState<string | undefined>();
  const chainId = useSelector(selectEvmChainId);
  const networkClientId = useSelector(selectNetworkClientId);

  useEffect(() => {
    const initializeSdk = async () => {
      try {
        if (!chainId || !isSupportedChain(getDecimalChainId(chainId))) {
          const errorMsg = 'Failed to initialize Staking SDK Service: chainId unsupported';
          trackErrorAsAnalytics('Staking SDK Initialization Failed', errorMsg);
          setError(errorMsg);
          return;
        }

        const provider = getProviderByChainId(chainId);

        if (!provider) {
          const errorMsg = 'Failed to initialize Staking SDK Service: provider not found';
          trackErrorAsAnalytics('Staking SDK Initialization Failed', errorMsg);
          setError(errorMsg);
          return;
        }

        const newSdk = await EarnSdk.create(provider, {
          chainId: getDecimalChainId(chainId),
        });

        if (!newSdk.contracts?.pooledStaking) {
          const errorMsg = 'Failed to create SDK Service. sdk.contracts.pooledStaking not found';
          trackErrorAsAnalytics('Staking SDK Initialization Failed', errorMsg);
          setError(errorMsg);
          return;
        }

        setSdk(newSdk);
        setError(undefined);
      } catch (err) {
        const errorMsg = (err as Error).message || 'Unknown error during SDK initialization';
        trackErrorAsAnalytics('Staking SDK Initialization Failed', errorMsg);
        setError(errorMsg);
      }
    };

    initializeSdk();
  }, [chainId, sdkType]);

  const stakeContextValue: Stake = {
    stakingContract: sdk?.contracts?.pooledStaking || undefined,
    sdkType,
    setSdkType,
    networkClientId,
    error,
  };

  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
