import { Hex } from '@metamask/utils';
import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectPooledStakingEnabledFlag } from '../../../../Earn/selectors/featureFlags';
import usePooledStakes from '../../../hooks/usePooledStakes';
import { useStakingChainByChainId } from '../../../hooks/useStakingChain';
import useVaultApyAverages from '../../../hooks/useVaultApyAverages';
import { StakeSDKProvider } from '../../../sdk/stakeSdkProvider';
import { getDecimalChainId } from '../../../../../../util/networks';
import {
  CommonPercentageInputUnits,
  formatPercent,
  PercentageOutputFormat,
} from '../../../utils/value';
import { TokenI } from '../../../../Tokens/types';
import StakingCta from '../StakingCta/StakingCta';

export interface StakingDiscoveryProps {
  asset: TokenI;
}

const StakingDiscoveryContent = ({ asset }: StakingDiscoveryProps) => {
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );
  const decimalChainId = getDecimalChainId(asset.chainId);
  const { hasStakedPositions, isLoadingPooledStakesData } =
    usePooledStakes(decimalChainId);
  const { vaultApyAverages, isLoadingVaultApyAverages } =
    useVaultApyAverages(decimalChainId);

  if (
    !isStakingSupportedChain ||
    !isPooledStakingEnabled ||
    hasStakedPositions ||
    isLoadingPooledStakesData ||
    isLoadingVaultApyAverages
  ) {
    return null;
  }

  return (
    <StakingCta
      chainId={asset.chainId as Hex}
      estimatedRewardRate={formatPercent(vaultApyAverages.oneWeek, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      })}
    />
  );
};

export const StakingDiscovery = ({ asset }: StakingDiscoveryProps) => (
  <StakeSDKProvider>
    <StakingDiscoveryContent asset={asset} />
  </StakeSDKProvider>
);

export default StakingDiscovery;
