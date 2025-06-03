import {
  StakingType,
  EarnSdk,
  PooledStakingContract,
  isSupportedPooledStakingChain,
  PooledStakingApiService,
} from '@metamask/stake-sdk';
import React, {
  useState,
  createContext,
  useEffect,
  PropsWithChildren,
  useMemo,
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
  stakingContract?: PooledStakingContract | null;
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
      let errorMsg = '';
      let errorType = '';
      try {
        if (!chainId || !isSupportedPooledStakingChain(getDecimalChainId(chainId))) {
          errorMsg = 'Failed to initialize Staking SDK Service: chainId unsupported';
          errorType = 'Staking SDK Initialization Failed';
          return;
        }

        const provider = getProviderByChainId(chainId);

        if (!provider) {
          errorMsg = 'Failed to initialize Staking SDK Service: provider not found';
          errorType = 'Staking SDK Initialization Failed';
          return;
        }

        const newSdk = await EarnSdk.create(provider, {
          chainId: getDecimalChainId(chainId),
        });

        if (!newSdk.contracts?.pooledStaking) {
          errorMsg = 'Failed to create SDK Service. sdk.contracts.pooledStaking not found';
          errorType = 'Staking SDK Initialization Failed';
          return;
        }

        setSdk(newSdk);
        setError(undefined);

      } catch (err) {
        errorMsg = (err as Error).message || 'Unknown error during SDK initialization';
        errorType = 'Staking SDK Initialization Failed';
      } finally {
        if (errorMsg) {
          trackErrorAsAnalytics(errorType, errorMsg);
          setError(errorMsg);
        }
      }
    };

    initializeSdk();
  }, [chainId, sdkType]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      stakingContract: sdk?.contracts?.pooledStaking,
      sdkType,
      setSdkType,
      networkClientId,
      error,
    }),
    [sdk?.contracts?.pooledStaking?.contract?.address ,sdkType, networkClientId]
  );

  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
