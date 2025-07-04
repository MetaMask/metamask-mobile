import { BigNumber } from 'bignumber.js';
import { getDecimalChainId } from '../../../../util/networks';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';

export const useEarnMetadata = (earnToken: EarnTokenDetails) => {
  const {
    annualRewardRate: annualRewardRateFromVault,
    annualRewardRateDecimal: annualRewardRateDecimalFromVault,
    isLoadingVaultMetadata: isLoadingVaultMetadataFromVault,
  } = useVaultMetadata(getDecimalChainId(earnToken?.chainId));

  if (!earnToken)
    return {
      annualRewardRate: '',
      annualRewardRateDecimal: 0,
      annualRewardRateValue: 0,
      isLoadingEarnMetadata: false,
    };

  let annualRewardRate = '';
  let annualRewardRateDecimal = 0;
  let annualRewardRateValue = 0;

  if (earnToken.experience.type === EARN_EXPERIENCES.STABLECOIN_LENDING) {
    annualRewardRate = BigNumber(earnToken.experience.apr).toFixed(1) + '%';
    annualRewardRateDecimal = parseFloat(
      BigNumber(earnToken.experience.apr).div(100).toFixed(),
    );
    annualRewardRateValue = parseFloat(earnToken.experience.apr);
  } else if (earnToken.experience.type === EARN_EXPERIENCES.POOLED_STAKING) {
    annualRewardRate = annualRewardRateFromVault;
    annualRewardRateDecimal = annualRewardRateDecimalFromVault;
    annualRewardRateValue = annualRewardRateDecimalFromVault * 100;
  }

  return {
    annualRewardRate,
    annualRewardRateDecimal,
    annualRewardRateValue,
    isLoadingEarnMetadata: isLoadingVaultMetadataFromVault,
  };
};
