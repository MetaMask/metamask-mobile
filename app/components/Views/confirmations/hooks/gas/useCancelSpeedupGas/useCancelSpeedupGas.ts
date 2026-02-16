import {
  CANCEL_RATE,
  GasFeeEstimateLevel,
  SPEED_UP_RATE,
  type GasFeeEstimates,
  type GasPriceGasFeeEstimates,
} from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../../selectors/currencyRateController';
import { selectNetworkConfigurationByChainId } from '../../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../../selectors/settings';
import type { Hex } from '@metamask/utils';
import { decGWEIToHexWEI, multiplyHexes } from '../../../../../../util/conversions';
import { addHexPrefix, renderFromWei } from '../../../../../../util/number';
import { isTestNet } from '../../../../../../util/networks';
import { strings } from '../../../../../../../locales/i18n';
import useFiatFormatter from '../../../../../../components/UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { getFeesFromHex } from '../../../utils/gas';
import { toHumanSeconds } from '../../../utils/time';
import type {
  CancelSpeedupParams,
  Eip1559ExistingGas,
  UseCancelSpeedupGasInput,
  UseCancelSpeedupGasResult,
} from './types';
import { useGasFeeEstimates } from '../useGasFeeEstimates';

const HEX_ZERO = '0x0';

/**
 * Extracts Medium fees and wait times by detecting the shape of the estimates object.
 */
function getMediumMarketFees(estimates: GasFeeEstimates | undefined) {
  const fallback = { maxFee: HEX_ZERO, priorityFee: HEX_ZERO, waitTime: undefined };

  if (!estimates) return fallback;

  // 1. Check for GasPriceGasFeeEstimates (direct eth_gasPrice)
  if ('gasPrice' in estimates) {
    const fee = (estimates as GasPriceGasFeeEstimates).gasPrice;
    return { maxFee: fee, priorityFee: fee, waitTime: undefined };
  }

  // 2. Check for Low/Medium/High structures (FeeMarket or Legacy)
  if (GasFeeEstimateLevel.Medium in estimates) {
    const medium = estimates[GasFeeEstimateLevel.Medium];

    // Check if it's FeeMarket (object) or Legacy (direct Hex string)
    if (typeof medium === 'object' && medium !== null) {
      const feeMarketMedium = medium as {suggestedMaxPriorityFeePerGas?: Hex; suggestedMaxFeePerGas?: Hex; minWaitTimeEstimate?: number};
      return {
        maxFee: feeMarketMedium.suggestedMaxFeePerGas,
        priorityFee: feeMarketMedium.suggestedMaxPriorityFeePerGas,
        waitTime: feeMarketMedium.minWaitTimeEstimate,
      };
    }

    // It's LegacyGasFeeEstimates (Medium is just a Hex string)
    const legacyFee = medium as Hex;
    return { maxFee: legacyFee, priorityFee: legacyFee, waitTime: undefined };
  }

  return fallback;
}

export function useCancelSpeedupGas({
  existingGas,
  tx,
  isCancel,
}: UseCancelSpeedupGasInput): UseCancelSpeedupGasResult {
  const chainId = tx?.chainId;
  const { networkClientId } = tx || {};

  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId || '');

  const networkConfig = useSelector((state: RootState) =>
    chainId ? selectNetworkConfigurationByChainId(state, chainId) : undefined,
  );
  const nativeConversionRate = useSelector((state: RootState) =>
    chainId ? selectConversionRateByChainId(state, chainId as Hex, true) : undefined,
  );
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const fiatFormatter = useFiatFormatter();
  const nativeTokenSymbol = networkConfig?.nativeCurrency ?? 'ETH';
  const nativeCurrency = networkConfig?.nativeCurrency;

  return useMemo((): UseCancelSpeedupGasResult => {
    const shouldHideFiat =
      Boolean(chainId && isTestNet(chainId as Hex)) && !showFiatOnTestnets;

    const empty: UseCancelSpeedupGasResult = {
      paramsForController: undefined,
      networkFeeDisplay: '0',
      networkFeeNative: '0',
      networkFeeFiat: null,
      speedDisplay: strings('transactions.gas_modal.medium'),
      nativeTokenSymbol,
    };

    if (!tx || !existingGas) {
      return empty;
    }

    // Clean up Gas Limit
    const gasLimitHex = tx.txParams?.gas ?? HEX_ZERO;
    const gasLimit = addHexPrefix(String(gasLimitHex));

    const rate = isCancel ? CANCEL_RATE : SPEED_UP_RATE;
    const market = getMediumMarketFees(gasFeeEstimates as GasFeeEstimates);

    let paramsForController: CancelSpeedupParams | undefined;
    let finalFeeHex: string;

    if (existingGas.isEIP1559Transaction) {
      const eip1559 = existingGas as Eip1559ExistingGas;

      // Parse existing Hex WEI values
      const existingMaxFee = new BigNumber(eip1559.maxFeePerGas ?? HEX_ZERO, 16);
      const existingPriority = new BigNumber(eip1559.maxPriorityFeePerGas ?? HEX_ZERO, 16);

      // Parse market Hex WEI values
      const marketMaxFee = new BigNumber(market.maxFee ?? HEX_ZERO, 16);
      const marketPriority = new BigNumber(market.priorityFee ?? HEX_ZERO, 16);

      // Calculate suggested (1.1x existing VS market medium)
      const suggestedMaxFee = BigNumber.max(existingMaxFee.times(rate), marketMaxFee);
      const suggestedPriority = BigNumber.max(existingPriority.times(rate), marketPriority);

      const maxFeePerGasHex = addHexPrefix(decGWEIToHexWEI(suggestedMaxFee).toString());
      const maxPriorityFeePerGasHex = addHexPrefix(decGWEIToHexWEI(suggestedPriority).toString());

      paramsForController = {
        maxFeePerGas: maxFeePerGasHex,
        maxPriorityFeePerGas: maxPriorityFeePerGasHex,
      };

      finalFeeHex = multiplyHexes(gasLimit, maxFeePerGasHex);

    } else {
      // Legacy / GasPrice logic
      const legacyGas = existingGas as { gasPrice?: string | number };
      const existingGasPrice = new BigNumber(String(legacyGas.gasPrice ?? HEX_ZERO), 16);
      const marketGasPrice = new BigNumber(market.maxFee ?? HEX_ZERO, 16);

      const suggestedGasPrice = BigNumber.max(existingGasPrice.times(rate), marketGasPrice).integerValue();
      const gasPriceHex = addHexPrefix(suggestedGasPrice.toString(16));

      paramsForController = { gasPrice: gasPriceHex };
      finalFeeHex = multiplyHexes(gasLimit, gasPriceHex);
    }

    // Common Display Logic
    const networkFeeNative = renderFromWei(finalFeeHex);
    const networkFeeDisplay = `${networkFeeNative} ${nativeTokenSymbol}`;
    const { currentCurrencyFee: networkFeeFiat } = getFeesFromHex({
      hexFee: finalFeeHex,
      nativeConversionRate,
      nativeCurrency,
      fiatFormatter,
      shouldHideFiat,
    });

    const waitMs = market.waitTime;
    const speedDisplay =
      waitMs != null && waitMs < 1000
        ? `${strings('transactions.gas_modal.medium')} < 1 sec`
        : waitMs != null
        ? `${strings('transactions.gas_modal.medium')} ~ ${toHumanSeconds(waitMs)}`
        : strings('transactions.gas_modal.medium');

    return {
      paramsForController,
      networkFeeDisplay,
      networkFeeNative,
      networkFeeFiat,
      speedDisplay,
      nativeTokenSymbol,
    };
  }, [
    existingGas,
    tx,
    isCancel,
    gasFeeEstimates,
    nativeTokenSymbol,
    nativeCurrency,
    nativeConversionRate,
    showFiatOnTestnets,
    chainId,
    fiatFormatter,
  ]);
}
