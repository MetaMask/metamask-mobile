import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { BN } from 'ethereumjs-util';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../util/conversions';

function useGasPriceEstimation({
  gasLimit = 21000,
  estimateRange = 'medium',
}: {
  gasLimit: number;
  estimateRange?: 'low' | 'medium' | 'high';
}) {
  const pollTokenRef = useRef(null);

  const gasFeeEstimates = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  );
  const gasFeeType = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.GasFeeController.gasEstimateType,
  );

  useEffect(() => {
    if (gasLimit === 0) return;
    const { GasFeeController } = Engine.context;
    async function polling() {
      const newPollToken =
        await GasFeeController.getGasFeeEstimatesAndStartPolling(
          pollTokenRef.current,
        );
      pollTokenRef.current = newPollToken;
    }
    polling();
    return () => {
      GasFeeController.stopPolling(pollTokenRef.current);
      pollTokenRef.current = null;
    };
  }, [gasLimit]);

  if (gasLimit === 0 || gasFeeType !== 'fee-market') {
    return null;
  }

  const suggestedMaxFeePerGas = (gasFeeEstimates as GasFeeEstimates)[
    estimateRange
  ].suggestedMaxFeePerGas;
  const weiSuggestedMaxFeePerGas = new BN(
    decGWEIToHexWEI(suggestedMaxFeePerGas) as string,
    'hex',
  );

  const estimatedGasFee = weiSuggestedMaxFeePerGas.muln(gasLimit);

  return {
    estimatedGasFee,
  };
}

export default useGasPriceEstimation;
