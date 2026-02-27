import {
  CANCEL_RATE,
  isEIP1559Transaction,
  SPEED_UP_RATE,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { weiHexToGweiDec } from '@metamask/controller-utils';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectGasFeeEstimates } from '../../../../../../selectors/confirmTransaction';
import { selectNetworkConfigurationByChainId } from '../../../../../../selectors/networkController';
import { getMediumGasPriceHex } from '../../../../../../util/confirmation/gas';
import {
  decGWEIToHexWEI,
  multiplyHexes,
} from '../../../../../../util/conversions';
import { addHexPrefix } from '../../../../../../util/number';
import { useFeeCalculations } from '../useFeeCalculations';
import type {
  UseCancelSpeedupGasInput,
  UseCancelSpeedupGasResult,
} from './types';

const HEX_ZERO = '0x0';

/** Stub passed to useFeeCalculations when tx is null so the hook is always called unconditionally. */
const STUB_TX = {
  txParams: { gas: '0x0' as const },
  networkClientId: '',
} as TransactionMeta;

export function useCancelSpeedupGas({
  tx,
  isCancel,
}: UseCancelSpeedupGasInput): UseCancelSpeedupGasResult {
  const chainId = tx?.chainId;

  const networkConfig = useSelector((state: RootState) =>
    chainId ? selectNetworkConfigurationByChainId(state, chainId) : undefined,
  );
  const gasFeeEstimates = useSelector(selectGasFeeEstimates);
  const nativeTokenSymbol = networkConfig?.nativeCurrency ?? 'ETH';

  const bumpResult = useMemo(() => {
    const txParams = tx?.txParams;
    if (!tx || !txParams) {
      return { paramsForController: undefined, finalFeeHex: HEX_ZERO };
    }

    const gasLimitHex = txParams.gas ?? HEX_ZERO;
    const gasLimit = addHexPrefix(String(gasLimitHex));
    const rate = isCancel ? CANCEL_RATE : SPEED_UP_RATE;

    let paramsForController: GasPriceValue | FeeMarketEIP1559Values | undefined;
    let finalFeeHex: string;

    if (isEIP1559Transaction(txParams)) {
      const existingMaxFeeGwei = weiHexToGweiDec(
        txParams.maxFeePerGas ?? '0x0',
      );
      const existingPriorityGwei = weiHexToGweiDec(
        txParams.maxPriorityFeePerGas ?? '0x0',
      );
      const existingMaxFee = new BigNumber(String(existingMaxFeeGwei ?? 0), 10);
      const existingPriority = new BigNumber(
        String(existingPriorityGwei ?? 0),
        10,
      );

      const suggestedMaxFee = existingMaxFee.times(rate);
      const suggestedPriority = existingPriority.times(rate);

      const maxFeePerGasHex = addHexPrefix(
        decGWEIToHexWEI(suggestedMaxFee.toString())?.toString(),
      );
      const maxPriorityFeePerGasHex = addHexPrefix(
        decGWEIToHexWEI(suggestedPriority.toString())?.toString(),
      );

      paramsForController = {
        maxFeePerGas: maxFeePerGasHex,
        maxPriorityFeePerGas: maxPriorityFeePerGasHex,
      };

      finalFeeHex = addHexPrefix(multiplyHexes(gasLimit, maxFeePerGasHex));
    } else {
      const existingGasPriceHex = txParams.gasPrice ?? '0x0';
      const existingGasPriceDecimal = parseInt(
        existingGasPriceHex === undefined ? '0x0' : String(existingGasPriceHex),
        16,
      );
      const existingGasPrice = new BigNumber(existingGasPriceDecimal, 10);
      const suggestedGasPrice = existingGasPrice.times(rate).integerValue();
      let gasPriceHex = addHexPrefix(suggestedGasPrice.toString(16));

      // Legacy tx with existing gasPrice 0x0 yields 0 * rate = 0; that would never get mined. Fall back to current network gas price estimate.
      if (suggestedGasPrice.isZero()) {
        gasPriceHex = getMediumGasPriceHex(gasFeeEstimates);
      }

      paramsForController = { gasPrice: gasPriceHex };
      finalFeeHex = addHexPrefix(multiplyHexes(gasLimit, gasPriceHex));
    }

    return { paramsForController, finalFeeHex };
  }, [tx, isCancel, gasFeeEstimates]);

  const displayTx = useMemo((): TransactionMeta | null => {
    if (!tx?.txParams || !bumpResult.paramsForController) return null;
    return {
      ...tx,
      txParams: { ...tx.txParams, ...bumpResult.paramsForController },
    };
  }, [tx, bumpResult.paramsForController]);

  const feeCalculations = useFeeCalculations(displayTx ?? STUB_TX);

  return useMemo((): UseCancelSpeedupGasResult => {
    const empty: UseCancelSpeedupGasResult = {
      paramsForController: undefined,
      networkFeeDisplay: '0',
      networkFeeNative: '0',
      networkFeeFiat: null,
      nativeTokenSymbol,
    };

    const txParams = tx?.txParams;
    if (!tx || !txParams) {
      return empty;
    }

    const { paramsForController } = bumpResult;
    const networkFeeNative = feeCalculations.estimatedFeeNative ?? '0';

    return {
      paramsForController,
      networkFeeDisplay: `${networkFeeNative} ${nativeTokenSymbol}`,
      networkFeeNative,
      networkFeeFiat: feeCalculations.estimatedFeeFiat,
      nativeTokenSymbol,
    };
  }, [
    tx,
    bumpResult,
    feeCalculations.estimatedFeeNative,
    feeCalculations.estimatedFeeFiat,
    nativeTokenSymbol,
  ]);
}
