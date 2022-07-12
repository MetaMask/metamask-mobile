import {
  estimateGas as estimasteGasDappTx,
  validateAmount as validateAmountDappTx,
  getGasAnalyticsParams as getGasAnalyticsParamsDappTx,
  handleGasFeeSelection as handleGasFeeSelectionDappTx,
  handleGetGasLimit as handleGetGasLimitDappTx,
} from './dappTransactions';

export const estimateGas = estimasteGasDappTx;
export const validateAmount = validateAmountDappTx;
export const getGasAnalyticsParams = getGasAnalyticsParamsDappTx;
export const handleGasFeeSelection = handleGasFeeSelectionDappTx;
export const handleGetGasLimit = handleGetGasLimitDappTx;
