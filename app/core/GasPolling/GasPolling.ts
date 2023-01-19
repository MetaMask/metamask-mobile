import { useSelector, shallowEqual } from 'react-redux';
import Engine from '../Engine';
import { fromWei } from '../../util/number';
import {
  parseTransactionEIP1559,
  parseTransactionLegacy,
  getNormalizedTxState,
} from '../../util/transactions';
import { UseGasTransactionProps, EIP1559Props, LegacyProps } from './types';
import Logger from '../../util/Logger';

/**
 *
 * @param {string} token Expects a token and when it is not provided, a random token is generated.
 * @returns the token that is used to identify the gas polling.
 */
export const startGasPolling = async (token?: string) => {
  const { GasFeeController }: any = Engine.context;
  const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(
    token,
  );
  return pollToken;
};

/**
 * @returns clears the token array state in the GasFeeController.
 */
export const stopGasPolling = () => {
  const { GasFeeController }: any = Engine.context;
  return GasFeeController.stopPolling();
};

export const useDataStore = () => {
  const [
    gasFeeEstimates,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    accounts,
    contractBalances,
    ticker,
    transaction,
    selectedAsset,
    showCustomNonce,
  ] = useSelector(
    (state: any) => [
      state.engine.backgroundState.GasFeeController.gasFeeEstimates,
      state.engine.backgroundState.TokenRatesController.contractExchangeRates,
      state.engine.backgroundState.CurrencyRateController.conversionRate,
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
      state.engine.backgroundState.CurrencyRateController.nativeCurrency,
      state.engine.backgroundState.AccountTrackerController.accounts,
      state.engine.backgroundState.TokenBalancesController.contractBalances,
      state.engine.backgroundState.NetworkController.provider.ticker,
      getNormalizedTxState(state),
      state.transaction.selectedAsset,
      state.settings.showCustomNonce,
    ],
    shallowEqual,
  );

  return {
    gasFeeEstimates,
    transaction,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    accounts,
    contractBalances,
    selectedAsset,
    ticker,
    showCustomNonce,
  };
};

/**
 * @param {EIP1559Props} props
 * @returns parsed transaction data for EIP1559 transactions.
 */
export const getEIP1559TransactionData = ({
  gas,
  gasFeeEstimates,
  transactionState,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  nativeCurrency,
  onlyGas,
}: EIP1559Props) => {
  try {
    if (!gas || !gasFeeEstimates || !currentCurrency || !nativeCurrency) {
      throw new Error('Insufficient data for transaction');
    }

    const parsedTransactionEIP1559 = parseTransactionEIP1559(
      {
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        nativeCurrency,
        transactionState,
        gasFeeEstimates,
        swapsParams: undefined,
        selectedGasFee: {
          ...gas,
          estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
        },
      },
      { onlyGas },
    );

    return parsedTransactionEIP1559;
  } catch (error) {
    Logger.error(error as Error, 'Unable to parse transaction data');
  }
};

/**
 *
 * @param {LegacyProps} props
 * @returns parsed transaction data for legacy transactions.
 */
export const getLegacyTransactionData = ({
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  transactionState,
  ticker,
  gas,
  onlyGas,
  multiLayerL1FeeTotal,
}: LegacyProps) => {
  try {
    const parsedTransationData = parseTransactionLegacy(
      {
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        transactionState,
        ticker,
        selectedGasFee: {
          ...gas,
        },
        multiLayerL1FeeTotal,
      },
      { onlyGas },
    );

    return parsedTransationData;
  } catch (error) {
    Logger.error(error as Error, 'Unable to parse transaction data');
  }
};

/**
 *
 * @returns {Object} the transaction data for the current transaction.
 */
export const useGasTransaction = ({
  onlyGas,
  gasSelected,
  legacy,
  gasObject,
  multiLayerL1FeeTotal,
  dappSuggestedEIP1559Gas,
  dappSuggestedGasPrice,
  transactionState,
}: UseGasTransactionProps) => {
  const {
    gasFeeEstimates,
    transaction,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    ticker,
  } = useDataStore();

  const {
    transaction: { gas: transactionGas },
  } = transaction;

  let initialGas;
  if (dappSuggestedEIP1559Gas) {
    initialGas = {
      suggestedMaxFeePerGas: fromWei(
        dappSuggestedEIP1559Gas.maxFeePerGas,
        'gwei',
      ),
      suggestedMaxPriorityFeePerGas: fromWei(
        dappSuggestedEIP1559Gas.maxPriorityFeePerGas,
        'gwei',
      ),
    };
  } else if (dappSuggestedGasPrice) {
    initialGas = {
      suggestedMaxFeePerGas: fromWei(dappSuggestedGasPrice, 'gwei'),
      suggestedMaxPriorityFeePerGas: fromWei(dappSuggestedGasPrice, 'gwei'),
    };
  } else {
    initialGas = gasFeeEstimates[gasSelected ?? ''] || {
      suggestedMaxFeePerGas: gasObject?.suggestedMaxFeePerGas,
      suggestedMaxPriorityFeePerGas: gasObject?.suggestedMaxPriorityFeePerGas,
    };
  }

  const suggestedGasLimit =
    gasObject?.suggestedGasLimit || fromWei(transactionGas, 'wei');

  const legacyGasLimit = gasObject?.legacyGasLimit || suggestedGasLimit;
  const legacyGasPrice =
    gasFeeEstimates[gasSelected ?? ''] ||
    gasObject?.suggestedGasPrice ||
    gasFeeEstimates?.gasPrice;

  if (legacy) {
    return getLegacyTransactionData({
      gas: {
        suggestedGasLimit: legacyGasLimit,
        suggestedGasPrice: legacyGasPrice,
      },
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState,
      ticker,
      onlyGas,
      multiLayerL1FeeTotal,
      nativeCurrency,
    });
  }

  return getEIP1559TransactionData({
    gas: {
      ...(gasSelected ? gasFeeEstimates[gasSelected] : initialGas),
      suggestedGasLimit,
      selectedOption: gasSelected,
    },
    gasFeeEstimates,
    transactionState,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    nativeCurrency,
    suggestedGasLimit,
    onlyGas,
  });
};
