import { useState, useEffect, useCallback } from 'react';
import { useStakeContext } from './useStakeContext';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import BN4 from 'bnjs4';
import { formatEther } from 'ethers/lib/utils';
import Engine from '../../../../core/Engine';
import { hexToBN } from '../../../../util/number';

interface StakingGasFee {
  estimatedGasFeeWei: BN4;
  isLoadingStakingGasFee: boolean;
  isStakingGasFeeError: boolean;
  refreshGasValues: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_GAS_LIMIT = 21000;
const GAS_LIMIT_BUFFER = 1.3;

const useStakingGasFee = (depositValueWei: string): StakingGasFee => {
  const { stakingContract } = useStakeContext();
  const selectedAddress =
    useSelector(selectSelectedInternalAccountFormattedAddress) || '';
  const [isLoadingStakingGasFee, setIsLoadingStakingGasFee] =
    useState<boolean>(true);
  const [isStakingGasFeeError, setIsStakingGasFeeError] =
    useState<boolean>(false);
  const [estimatedGasFeeWei, setEstimatedGasFeeWei] = useState<BN4>(new BN4(0));

  const fetchDepositGasValues = useCallback(async () => {
    const { GasFeeController } = Engine.context;

    setIsLoadingStakingGasFee(true);
    setIsStakingGasFeeError(false);
    try {
      const result = await GasFeeController.fetchGasFeeEstimates();
      if (!stakingContract) {
        throw new Error('Staking contract is not available');
      }
      const depositGasLimit =
        depositValueWei === '0'
          ? DEFAULT_GAS_LIMIT
          : await stakingContract.estimateDepositGas(
              formatEther(depositValueWei),
              selectedAddress,
              ZERO_ADDRESS,
            );

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

      setEstimatedGasFeeWei(estimatedGasFee);
    } catch (error) {
      console.error('Error calculating gas fees', error);
      setIsStakingGasFeeError(true);
    } finally {
      setIsLoadingStakingGasFee(false);
    }
  }, [depositValueWei, stakingContract, selectedAddress]);

  useEffect(() => {
    fetchDepositGasValues();
  }, [fetchDepositGasValues]);

  return {
    estimatedGasFeeWei,
    isLoadingStakingGasFee,
    isStakingGasFeeError,
    refreshGasValues: fetchDepositGasValues,
  };
};

export default useStakingGasFee;
