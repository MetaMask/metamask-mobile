import {
  GasFeeEstimateType,
  GasFeeEstimateLevel,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { BigNumber } from 'bignumber.js';

import type {
  TransactionMetrics,
  TransactionMetricsBuilderRequest,
} from '../types';
import type { RootState } from '../../../../../reducers';

export function getGasMetricsProperties({
  transactionMeta,
  getState,
}: TransactionMetricsBuilderRequest): TransactionMetrics {
  const {
    chainId,
    dappSuggestedGasFees,
    gasFeeEstimatesLoaded,
    gasFeeEstimates,
    gasFeeTokens,
    selectedGasFeeToken,
    txParams,
    userFeeLevel,
  } = transactionMeta;

  const { from } = txParams ?? {};
  const { type: gasFeeEstimateType } = gasFeeEstimates ?? {};

  const presentedGasFeeOptions = ['custom'];

  if (gasFeeEstimatesLoaded) {
    if (
      gasFeeEstimateType === GasFeeEstimateType.FeeMarket ||
      gasFeeEstimateType === GasFeeEstimateType.Legacy
    ) {
      presentedGasFeeOptions.push(
        GasFeeEstimateLevel.Low,
        GasFeeEstimateLevel.Medium,
        GasFeeEstimateLevel.High,
      );
    }

    if (gasFeeEstimateType === GasFeeEstimateType.GasPrice) {
      presentedGasFeeOptions.push('network_proposed');
    }

    if (dappSuggestedGasFees) {
      presentedGasFeeOptions.push('dapp_proposed');
    }
  }

  const gas_payment_tokens_available = gasFeeTokens?.map(
    (token) => token.symbol,
  );

  let gas_paid_with = gasFeeTokens?.find(
    (token) =>
      token.tokenAddress.toLowerCase() === selectedGasFeeToken?.toLowerCase(),
  )?.symbol;

  if (selectedGasFeeToken?.toLowerCase() === getNativeTokenAddress(chainId)) {
    gas_paid_with = 'pre-funded_ETH';
  }

  const state = getState();
  const gas_insufficient_native_asset = getNativeBalance(
    state,
    chainId,
    from,
  ).lt(getMaxGasCost(transactionMeta));

  return {
    properties: {
      gas_estimation_failed: !gasFeeEstimatesLoaded,
      gas_fee_presented: presentedGasFeeOptions,
      gas_fee_selected: userFeeLevel,
      gas_insufficient_native_asset,
      gas_paid_with,
      gas_payment_tokens_available,
    },
    sensitiveProperties: {},
  };
}

function getMaxGasCost(transactionMeta: TransactionMeta): BigNumber {
  const { gas, gasPrice, maxFeePerGas } = transactionMeta.txParams ?? {};

  return new BigNumber(gas ?? '0x0').multipliedBy(
    maxFeePerGas ?? gasPrice ?? '0x0',
  );
}

function getNativeBalance(
  state: RootState,
  chainId: string,
  address: string,
): BigNumber {
  const accountsByChainId =
    state.engine?.backgroundState?.AccountTrackerController?.accountsByChainId;

  const account = accountsByChainId?.[chainId]?.[address?.toLowerCase()];

  return new BigNumber((account?.balance as Hex) ?? '0x0');
}
