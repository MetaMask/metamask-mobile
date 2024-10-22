import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
  type StakingApiService,
  isSupportedChain,
  ChainId,
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

const hexToChainId = (hex: `0x${string}`): ChainId =>
  hexToDecimal(hex).toString() as unknown as ChainId;

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
    if (!chainId || !isSupportedChain(hexToChainId(chainId))) {
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
      chainId: parseInt(hexToChainId(chainId).toString()),
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
