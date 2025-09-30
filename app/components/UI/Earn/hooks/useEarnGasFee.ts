import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import BN4 from 'bnjs4';
import { formatEther } from 'ethers/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { hexToBN } from '../../../../util/number';
import { useStakeContext } from '../../Stake/hooks/useStakeContext';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import { EVM_SCOPE } from '../constants/networks';

interface EarnGasFee {
  estimatedEarnGasFeeWei: BN4;
  isLoadingEarnGasFee: boolean;
  isEarnGasFeeError: boolean;
  refreshEarnGasValues: () => void;
  getEstimatedEarnGasFee: (amountMinimalUnit: BN4) => Promise<BN4>;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEFAULT_GAS_LIMIT = 21000;
const GAS_LIMIT_BUFFER = 1.3;

const useEarnDepositGasFee = (
  amountTokenMinimalUnit: BN4,
  earnExperience: EarnTokenDetails['experience'],
): EarnGasFee => {
  // TODO: move to using the earn controller for gas estimation fot pooled staking
  const { stakingContract, lendingContracts } = useStakeContext();
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : '';
  const [isLoadingEarnGasFee, setIsLoadingEarnGasFee] =
    useState<boolean>(false);
  const [isEarnGasFeeError, setIsEarnGasFeeError] = useState<boolean>(false);
  const [estimatedEarnGasFeeWei, setEstimatedEarnGasFeeWei] = useState<BN4>(
    new BN4(0),
  );

  const getEstimatedEarnGasFee = useCallback(
    async (amountMinimalUnit: BN4) => {
      const isPooledStaking =
        earnExperience.type === EARN_EXPERIENCES.POOLED_STAKING;
      const isStablecoinLending =
        earnExperience.type === EARN_EXPERIENCES.STABLECOIN_LENDING;

      const { GasFeeController } = Engine.context;
      const result = await GasFeeController.fetchGasFeeEstimates();

      let depositGasLimit = DEFAULT_GAS_LIMIT;
      if (isPooledStaking) {
        depositGasLimit = amountMinimalUnit.eq(new BN4(0))
          ? DEFAULT_GAS_LIMIT
          : (await stakingContract?.estimateDepositGas(
              formatEther(amountMinimalUnit.toString()),
              selectedAddress,
              ZERO_ADDRESS,
            )) || DEFAULT_GAS_LIMIT;
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
      return estimatedGasFee;
    },
    [earnExperience.type, stakingContract, selectedAddress],
  );

  const fetchEarnGasValues = useCallback(async () => {
    setIsLoadingEarnGasFee(true);
    setIsEarnGasFeeError(false);

    const isPooledStaking =
      earnExperience.type === EARN_EXPERIENCES.POOLED_STAKING;
    const isStablecoinLending =
      earnExperience.type === EARN_EXPERIENCES.STABLECOIN_LENDING;

    if (isPooledStaking && !stakingContract) {
      setIsEarnGasFeeError(true);
      setIsLoadingEarnGasFee(false);
      return;
    }
    if (isStablecoinLending && !lendingContracts) {
      setIsEarnGasFeeError(true);
      setIsLoadingEarnGasFee(false);
      return;
    }

    try {
      const estimatedGasFee = await getEstimatedEarnGasFee(
        amountTokenMinimalUnit,
      );

      setEstimatedEarnGasFeeWei(estimatedGasFee);
    } catch (error) {
      console.error('Error calculating gas fees', error);
      setIsEarnGasFeeError(true);
    } finally {
      setIsLoadingEarnGasFee(false);
    }
  }, [
    earnExperience.type,
    stakingContract,
    lendingContracts,
    amountTokenMinimalUnit,
    getEstimatedEarnGasFee,
  ]);

  useEffect(() => {
    fetchEarnGasValues();
  }, [fetchEarnGasValues]);

  return {
    estimatedEarnGasFeeWei,
    isLoadingEarnGasFee,
    isEarnGasFeeError,
    refreshEarnGasValues: fetchEarnGasValues,
    getEstimatedEarnGasFee,
  };
};

export default useEarnDepositGasFee;
