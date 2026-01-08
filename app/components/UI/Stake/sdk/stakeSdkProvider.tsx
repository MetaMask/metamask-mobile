import {
  EarnApiService,
  EarnSdk,
  LendingProvider,
  PooledStakingContract,
  StakingType,
} from '@metamask/stake-sdk';
import { LendingProtocol } from '../../Earn/types/lending.types';
import React, {
  createContext,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  selectEvmChainId,
  selectNetworkClientId,
} from '../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../util/networks';
import { getProviderByChainId } from '../../../../util/notifications';

export const earnApiService = new EarnApiService();
export const stakingApiService = earnApiService.pooledStaking;
export const lendingApiService = earnApiService.lending;
export const tronStakingApiService = earnApiService.tronStaking;

export interface Stake {
  stakingContract?: PooledStakingContract | null;
  lendingContracts?: Partial<
    Record<LendingProtocol, Record<string, LendingProvider>>
  > | null;
  networkClientId?: string;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export interface StakeProviderProps {
  stakingType?: StakingType;
}
export const StakeSDKProvider: React.FC<
  PropsWithChildren<StakeProviderProps>
> = ({ children }) => {
  const chainId = useSelector(selectEvmChainId);
  const networkClientId = useSelector(selectNetworkClientId);
  const [sdkService, setSdkService] = useState<EarnSdk | undefined>();

  useEffect(() => {
    const initializeSdk = async () => {
      if (!chainId) {
        return;
      }

      const provider = getProviderByChainId(chainId);

      if (!provider) {
        console.error(
          'Failed to initialize Staking SDK Service: provider not found',
        );
        return;
      }

      try {
        const sdk = await EarnSdk.create(provider, {
          chainId: getDecimalChainId(chainId),
        });
        setSdkService(sdk);
      } catch (error) {
        console.error('Failed to initialize Earm SDK Service:', error);
      }
    };

    initializeSdk();
  }, [chainId]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      stakingContract: sdkService?.contracts?.pooledStaking,
      lendingContracts: sdkService?.contracts?.lending,
      networkClientId,
    }),
    [
      sdkService?.contracts?.pooledStaking,
      sdkService?.contracts?.lending,
      networkClientId,
    ],
  );

  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
