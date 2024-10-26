import { useState, useEffect } from 'react';
import { useStakeContext } from './useStakeContext';
import type { PooledStakingContract } from '@metamask/stake-sdk';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectGasFeeControllerState } from '../../../../selectors/gasFeeController';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { BN } from 'ethereumjs-util';
import { formatEther } from 'ethers/lib/utils';
import Engine from '../../../../core/Engine';
import { hexToBN } from '../../../../util/number';

interface StakingGasFee {
  estimatedGasFeeWei: BN;
  gasLimit: number;
  isLoadingStakingGasFee: boolean;
  isStakingGasFeeError: boolean;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_GAS_LIMIT = 21000;
const GAS_LIMIT_BUFFER = 1.3;

const useStakingGasFee = (depositValueWei: string): StakingGasFee => {
  const sdk = useStakeContext();
  const gasFeeControllerState = useSelector(selectGasFeeControllerState);

  const selectedAddress =
    useSelector(selectSelectedInternalAccountChecksummedAddress) || '';
  const pooledStakingContract = sdk.stakingContract as PooledStakingContract;
  const [gasLimit, setGasLimit] = useState<number>(0);
  const [isLoadingStakingGasFee, setIsLoadingStakingGasFee] =
    useState<boolean>(true);
  const [isStakingGasFeeError, setIsStakingGasFeeError] =
    useState<boolean>(false);

  useEffect(() => {
    const { GasFeeController } = Engine.context;

    const fetchDepositGasValues = async () => {
      setIsLoadingStakingGasFee(true);
      setIsStakingGasFeeError(false);
      try {
        await GasFeeController.fetchGasFeeEstimates();
        const depositGasLimit =
          depositValueWei === '0'
            ? DEFAULT_GAS_LIMIT
            : await pooledStakingContract.estimateDepositGas(
                formatEther(depositValueWei),
                selectedAddress,
                ZERO_ADDRESS,
              );

        const gasLimitWithBuffer = Math.ceil(
          depositGasLimit * GAS_LIMIT_BUFFER,
        );
        setGasLimit(gasLimitWithBuffer);
      } catch (error) {
        console.error('Error fetching gas limit:', error);
        setGasLimit(DEFAULT_GAS_LIMIT);
        setIsStakingGasFeeError(true);
      } finally {
        setIsLoadingStakingGasFee(false);
      }
    };

    fetchDepositGasValues();
  }, [depositValueWei, pooledStakingContract, selectedAddress]);

  if (
    gasLimit === 0 ||
    gasFeeControllerState.gasEstimateType === GAS_ESTIMATE_TYPES.NONE
  ) {
    return {
      estimatedGasFeeWei: new BN(0),
      gasLimit,
      isLoadingStakingGasFee,
      isStakingGasFeeError: true,
    };
  }

  const estimateRange = 'medium';
  let gasPrice: string;

  try {
    switch (gasFeeControllerState.gasEstimateType) {
      case GAS_ESTIMATE_TYPES.FEE_MARKET:
        gasPrice =
          gasFeeControllerState.gasFeeEstimates[estimateRange]
            .suggestedMaxFeePerGas;
        break;
      case GAS_ESTIMATE_TYPES.LEGACY:
        gasPrice = gasFeeControllerState.gasFeeEstimates[estimateRange];
        break;
      default:
        gasPrice = gasFeeControllerState.gasFeeEstimates.gasPrice;
        break;
    }

    const weiGasPrice = hexToBN(decGWEIToHexWEI(gasPrice));
    const estimatedGasFeeWei = weiGasPrice.muln(gasLimit);

    return {
      estimatedGasFeeWei,
      gasLimit,
      isLoadingStakingGasFee,
      isStakingGasFeeError,
    };
  } catch (error) {
    console.error('Error calculating gas fee estimate:', error);
    return {
      estimatedGasFeeWei: new BN(0),
      gasLimit: 0,
      isLoadingStakingGasFee: false,
      isStakingGasFeeError: true,
    };
  }
};

export default useStakingGasFee;
