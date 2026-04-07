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
import { selectTransactionMetadataById } from '../../../../../../selectors/transactionController';
import { getMediumGasPriceHex } from '../../../../../../util/confirmation/gas';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import { addHexPrefix } from '../../../../../../util/number';
import { useFeeCalculations } from '../useFeeCalculations';
import type {
  UseCancelSpeedupGasInput,
  UseCancelSpeedupGasResult,
} from './types';

const HEX_ZERO = '0x0';

/** Stub passed to useFeeCalculations when tx is null so the hook is always called unconditionally. */
const STUB_TX = {
  txParams: { gas: HEX_ZERO },
  networkClientId: '',
} as TransactionMeta;

/**
 * Returns gas params to use for speed up (bump) or cancel, for seeding the transaction
 * when the cancel/speed up modal opens. Used with updateTransactionGasFees so the gas
 * modal shows the suggested values; user can then edit via the gas modal.
 *
 * @param gasFeeEstimates - From selectGasFeeEstimates; only used for legacy fallback when existing gasPrice is zero.
 */
export function getBumpParamsForCancelSpeedup(
  tx: TransactionMeta,
  isCancel: boolean,
  gasFeeEstimates?: ReturnType<typeof selectGasFeeEstimates>,
): GasPriceValue | FeeMarketEIP1559Values | undefined {
  const txParams = tx?.txParams;
  if (!tx || !txParams) {
    return undefined;
  }

  const rate = isCancel ? CANCEL_RATE : SPEED_UP_RATE;

  if (isEIP1559Transaction(txParams)) {
    const existingMaxFeeGwei = weiHexToGweiDec(
      txParams.maxFeePerGas ?? HEX_ZERO,
    );
    const existingPriorityGwei = weiHexToGweiDec(
      txParams.maxPriorityFeePerGas ?? HEX_ZERO,
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

    return {
      maxFeePerGas: maxFeePerGasHex,
      maxPriorityFeePerGas: maxPriorityFeePerGasHex,
    };
  }

  const existingGasPriceHex = txParams.gasPrice ?? HEX_ZERO;
  const existingGasPriceDecimal = parseInt(
    existingGasPriceHex === undefined ? HEX_ZERO : String(existingGasPriceHex),
    16,
  );
  const existingGasPrice = new BigNumber(existingGasPriceDecimal, 10);
  const suggestedGasPrice = existingGasPrice.times(rate).integerValue();
  let gasPriceHex = addHexPrefix(suggestedGasPrice.toString(16));

  if (suggestedGasPrice.isZero() && gasFeeEstimates) {
    gasPriceHex = getMediumGasPriceHex(
      gasFeeEstimates as Parameters<typeof getMediumGasPriceHex>[0],
    );
  }

  return { gasPrice: gasPriceHex };
}

/** Extract controller params (gas fields only) from tx.txParams for speedUpTransaction/stopTransaction. */
function getParamsFromTx(
  tx: TransactionMeta,
): GasPriceValue | FeeMarketEIP1559Values | undefined {
  const txParams = tx?.txParams;
  if (!tx || !txParams) return undefined;

  if (isEIP1559Transaction(txParams)) {
    const maxFeePerGas = txParams.maxFeePerGas;
    const maxPriorityFeePerGas = txParams.maxPriorityFeePerGas;
    if (maxFeePerGas && maxPriorityFeePerGas) {
      return { maxFeePerGas, maxPriorityFeePerGas };
    }
    return undefined;
  }

  const gasPrice = txParams.gasPrice;
  return gasPrice ? { gasPrice } : undefined;
}

export function useCancelSpeedupGas({
  txId,
}: UseCancelSpeedupGasInput): UseCancelSpeedupGasResult {
  const tx = useSelector((state: RootState) =>
    txId ? selectTransactionMetadataById(state, txId) : undefined,
  );

  const chainId = tx?.chainId;

  const networkConfig = useSelector((state: RootState) =>
    chainId ? selectNetworkConfigurationByChainId(state, chainId) : undefined,
  );
  const nativeTokenSymbol = networkConfig?.nativeCurrency ?? 'ETH';

  const paramsForController = useMemo(
    () => (tx ? getParamsFromTx(tx) : undefined),
    [tx],
  );

  const feeCalculations = useFeeCalculations(tx ?? STUB_TX);

  return useMemo((): UseCancelSpeedupGasResult => {
    const empty: UseCancelSpeedupGasResult = {
      paramsForController: undefined,
      networkFeeDisplay: '0',
      networkFeeNative: '0',
      networkFeeFiat: null,
      nativeTokenSymbol,
    };

    if (!tx?.txParams || !paramsForController) {
      return empty;
    }

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
    paramsForController,
    feeCalculations.estimatedFeeNative,
    feeCalculations.estimatedFeeFiat,
    nativeTokenSymbol,
  ]);
}
