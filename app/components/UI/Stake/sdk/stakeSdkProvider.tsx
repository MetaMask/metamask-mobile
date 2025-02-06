import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  isSupportedChain,
  StakingApiService,
} from '@metamask/stake-sdk';
import React, {
  useState,
  createContext,
  useMemo,
  PropsWithChildren,
} from 'react';
import { getProviderByChainId } from '../../../../util/notifications';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectNetworkClientId,
} from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';

export const SDK = StakeSdk.create({ stakingType: StakingType.POOLED });

export const stakingApiService = new StakingApiService();

export interface Stake {
  stakingContract?: PooledStakingContract;
  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
  networkClientId?: string;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
}
export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children }) => {
  const [sdkType, setSdkType] = useState(StakingType.POOLED);
  const chainId = useSelector(selectEvmChainId);
  const networkClientId = useSelector(selectNetworkClientId);

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
      sdkType,
      setSdkType,
      networkClientId,
    }),
    [sdkService?.pooledStakingContract, sdkType, networkClientId],
  );
  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
