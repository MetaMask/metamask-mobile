import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  GAS_ESTIMATE_TYPES,
  type GasFeeController as GasFeeControllerType,
} from '@metamask/gas-fee-controller';

import { BN } from 'ethereumjs-util';
import Engine from '../../../../core/Engine';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { selectGasFeeControllerState } from '../../../../selectors/gasFeeController';

const defaultGasLimit = 21000;

interface Options {
  gasLimit?: number;
  estimateRange?: 'low' | 'medium' | 'high';
}

/**
 * Returns the estimated gas fee for a transaction.
 * Returns null if the gas limit is 0 or if the gas fee controller has no estimates.
 *
 * @param options - The options object
 * @param options.gasLimit - The gas limit for the transaction, defaults to 21_000. If 0 is passed,
 * it returns null, used in the buy flow
 * @param options.estimateRange - The range to use for the estimation, defaults to 'medium'
 * @returns The estimated gas fee in estimatedGasFee property as BN or null
 */
function useGasPriceEstimation({
  gasLimit = defaultGasLimit,
  estimateRange = 'medium',
}: Options) {
  const pollTokenRef = useRef<string>();

  const gasFeeControllerState = useSelector(selectGasFeeControllerState);

  useEffect(() => {
    if (gasLimit === 0) return;
    const { GasFeeController }: { GasFeeController: GasFeeControllerType } =
      Engine.context;
    async function polling() {
      const newPollToken =
        await GasFeeController.getGasFeeEstimatesAndStartPolling(
          pollTokenRef.current,
        );
      pollTokenRef.current = newPollToken;
    }
    polling();
    return () => {
      if (!pollTokenRef.current) {
        GasFeeController.stopPolling();
      } else {
        GasFeeController.disconnectPoller(pollTokenRef.current);
        pollTokenRef.current = undefined;
      }
    };
  }, [gasLimit]);

  if (
    gasLimit === 0 ||
    gasFeeControllerState.gasEstimateType === GAS_ESTIMATE_TYPES.NONE
  ) {
    return null;
  }

  let gasPrice;

  if (gasFeeControllerState.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
    gasPrice =
      gasFeeControllerState.gasFeeEstimates[estimateRange]
        .suggestedMaxFeePerGas;
  } else if (
    gasFeeControllerState.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
  ) {
    gasPrice = gasFeeControllerState.gasFeeEstimates[estimateRange];
  } else {
    gasPrice = gasFeeControllerState.gasFeeEstimates.gasPrice;
  }

  const weiGasPrice = new BN(decGWEIToHexWEI(gasPrice) as string, 'hex');
  const estimatedGasFee = weiGasPrice.muln(gasLimit);

  return {
    estimatedGasFee,
  };
}

export default useGasPriceEstimation;
