import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import BN4 from 'bnjs4';
import { formatEther } from 'ethers/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { hexToBN } from '../../../../util/number';
import { useStakeContext } from '../../Stake/hooks/useStakeContext';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';

interface EarnGasFee {
  estimatedEarnGasFeeWei: BN4;
  isLoadingEarnGasFee: boolean;
  isEarnGasFeeError: boolean;
  refreshEarnGasValues: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_GAS_LIMIT = 21000;
const GAS_LIMIT_BUFFER = 1.3;

const useEarnDepositGasFee = (
  amountTokenMinimalUnit: string,
  earnExperience: EarnTokenDetails['experience'],
): EarnGasFee => {
  // move to using the controller once it has proper handling error flow
  const { stakingContract, lendingContracts } = useStakeContext();
  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const [isLoadingEarnGasFee, setIsLoadingEarnGasFee] = useState<boolean>(true);
  const [isEarnGasFeeError, setIsEarnGasFeeError] = useState<boolean>(false);
  const [estimatedEarnGasFeeWei, setEstimatedEarnGasFeeWei] = useState<BN4>(
    new BN4(0),
  );

  const fetchEarnGasValues = useCallback(async () => {
    const isPooledStaking =
      earnExperience.type === EARN_EXPERIENCES.POOLED_STAKING;
    const isStablecoinLending =
      earnExperience.type === EARN_EXPERIENCES.STABLECOIN_LENDING;
    if (isPooledStaking && stakingContract === null) {
      setIsEarnGasFeeError(true);
      setIsLoadingEarnGasFee(false);
      return;
    }
    if (isStablecoinLending && lendingContracts === null) {
      setIsEarnGasFeeError(true);
      setIsLoadingEarnGasFee(false);
      return;
    }
    if (
      typeof stakingContract === 'undefined' ||
      typeof lendingContracts === 'undefined'
    ) {
      setIsLoadingEarnGasFee(true);
      return;
    }

    setIsLoadingEarnGasFee(true);
    setIsEarnGasFeeError(false);

    const { GasFeeController } = Engine.context;

    try {
      const result = await GasFeeController.fetchGasFeeEstimates();
      let depositGasLimit = DEFAULT_GAS_LIMIT;
      if (isPooledStaking) {
        depositGasLimit =
          (await stakingContract?.estimateDepositGas(
            formatEther(amountTokenMinimalUnit),
            selectedAddress,
            ZERO_ADDRESS,
          )) || depositGasLimit;
      } else if (isStablecoinLending) {
        // do nothing for now as we need to have allowance to guarantee supply success
      }

      const gasLimitWithBuffer = Math.ceil(depositGasLimit * GAS_LIMIT_BUFFER);

      const estimateRange = 'high';
      let gasPrice: string;

      switch (result.gasEstimateType) {
        case GAS_ESTIMATE_TYPES.FEE_MARKET:
          gasPrice =
            result.gasFeeEstimates[estimateRange].suggestedMaxFeePerGas;
          break;
        case GAS_ESTIMATE_TYPES.LEGACY:
          gasPrice = result.gasFeeEstimates[estimateRange];
          break;
        default:
          gasPrice = result.gasFeeEstimates.gasPrice;
          break;
      }

      const weiGasPrice = hexToBN(decGWEIToHexWEI(gasPrice));
      const estimatedGasFee = weiGasPrice.muln(gasLimitWithBuffer);

      setEstimatedEarnGasFeeWei(estimatedGasFee);
    } catch (error) {
      console.error('Error calculating gas fees', error);
      setIsEarnGasFeeError(true);
    } finally {
      setIsLoadingEarnGasFee(false);
    }
  }, [
    earnExperience,
    stakingContract,
    lendingContracts,
    selectedAddress,
    amountTokenMinimalUnit,
  ]);

  useEffect(() => {
    fetchEarnGasValues();
  }, [fetchEarnGasValues]);

  return {
    estimatedEarnGasFeeWei,
    isLoadingEarnGasFee,
    isEarnGasFeeError,
    refreshEarnGasValues: fetchEarnGasValues,
  };
};

export default useEarnDepositGasFee;
