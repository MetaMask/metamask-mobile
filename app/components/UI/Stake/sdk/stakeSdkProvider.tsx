import {
  StakingType,
  StakeSdk,
  PooledStakingContract,
} from '@metamask/stake-sdk';
import React, { useState, createContext, useMemo } from 'react';
import { getProviderByChainId } from '../../../../util/notifications';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../selectors/networkController';
import { hexToDecimal } from '../../../../util/conversions';

export interface Stake {
  sdkService: PooledStakingContract; // to do : facade it for other services implementation
  sdkType?: StakingType;
  setSdkType: (stakeType: StakingType) => void;
}

export const StakeContext = createContext<Stake | undefined>(undefined);

export const StakeSDKProvider: React.FC = ({ children }) => {
  const [sdkType, setSdkType] = useState(StakingType.POOLED);

  const chainId = useSelector(selectChainId);

  const sdkService = useMemo(() => {
    const provider = getProviderByChainId(chainId);

    const sdk = StakeSdk.create({
      chainId: parseInt(hexToDecimal(chainId).toString()),
      stakingType: sdkType,
    });

    sdk.pooledStakingContract.connectSignerOrProvider(provider);

    return sdk.pooledStakingContract;
  }, [chainId, sdkType]);

  const stakeContextValue = useMemo(
    (): Stake => ({
      sdkService,
      sdkType,
      setSdkType,
    }),
    [sdkService, sdkType, setSdkType],
  );

  return (
    <StakeContext.Provider value={stakeContextValue}>
      {children}
    </StakeContext.Provider>
  );
};
