import { useEffect, useMemo, useState } from 'react';
import type { NetworkConfiguration } from '@metamask/network-controller';
import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type GasFeeEstimates,
} from '@metamask/transaction-controller';
import { isStrictHexString, type Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import type { RootState } from '../../../../../reducers';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { selectConversionRateByChainId } from '../../../../../selectors/currencyRateController';
import {
  checkNetworkAndAccountSupports1559,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../../../selectors/networkController';
import { selectShowFiatInTestnets } from '../../../../../selectors/settings';
import { hexToDecimal } from '../../../../../util/conversions';
import { isTestNet } from '../../../../../util/networks';
import useFiatFormatter from '../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  calculateGasEstimate,
  getFeesFromHex,
} from '../../../../Views/confirmations/utils/gas';
import {
  createEIP7702UpgradeTransactionParams,
  getEIP7702AccountUpgradeStatus,
} from '../../utils/eip7702AccountUpgrade';

interface FeeCalculationInputs {
  estimatedBaseFee: string | undefined;
  feePerGas: string;
  gas: string;
  gasPrice: string;
  layer1GasFee?: string;
  priorityFeePerGas: string;
  shouldUseEIP1559FeeLogic: boolean;
}

type FeeEstimateState =
  | { status: 'loading' }
  | { status: 'not-required' }
  | { status: 'ready'; inputs: FeeCalculationInputs }
  | { status: 'error' };

export type EIP7702UpgradeFee =
  | { status: 'loading' }
  | { status: 'not-required' }
  | { status: 'ready'; fee: string }
  | { status: 'error' };

function getNetworkClientId(
  networkConfiguration: NetworkConfiguration | undefined,
): string | undefined {
  const defaultRpcEndpoint =
    networkConfiguration?.rpcEndpoints[
      networkConfiguration.defaultRpcEndpointIndex
    ];

  return (defaultRpcEndpoint as { networkClientId?: string } | undefined)
    ?.networkClientId;
}

function getEstimatedBaseFee(
  gasFeeEstimates: Awaited<
    ReturnType<typeof Engine.context.GasFeeController.fetchGasFeeEstimates>
  >['gasFeeEstimates'],
): string | undefined {
  return 'estimatedBaseFee' in gasFeeEstimates
    ? gasFeeEstimates.estimatedBaseFee
    : undefined;
}

function getGasValues(
  gasFeeEstimates: GasFeeEstimates,
  shouldUseEIP1559FeeLogic: boolean,
): Pick<FeeCalculationInputs, 'feePerGas' | 'gasPrice' | 'priorityFeePerGas'> {
  if (gasFeeEstimates.type === GasFeeEstimateType.FeeMarket) {
    const mediumEstimate = gasFeeEstimates[GasFeeEstimateLevel.Medium];

    return {
      feePerGas: hexToDecimal(mediumEstimate.maxFeePerGas).toString(),
      gasPrice: mediumEstimate.maxFeePerGas,
      priorityFeePerGas: hexToDecimal(
        mediumEstimate.maxPriorityFeePerGas,
      ).toString(),
    };
  }

  const gasPrice =
    gasFeeEstimates.type === GasFeeEstimateType.Legacy
      ? gasFeeEstimates[GasFeeEstimateLevel.Medium]
      : gasFeeEstimates.gasPrice;
  const gasPriceDecimal = hexToDecimal(gasPrice).toString();

  return {
    feePerGas: gasPriceDecimal,
    gasPrice,
    priorityFeePerGas: shouldUseEIP1559FeeLogic ? gasPriceDecimal : '0',
  };
}

export function useEIP7702UpgradeFee(): EIP7702UpgradeFee {
  const address = useSelector(selectSourceWalletAddress);
  const sourceToken = useSelector(selectSourceToken);
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);
  const sourceChainId = sourceToken?.chainId;
  const networkConfiguration = isStrictHexString(sourceChainId)
    ? networkConfigurations[sourceChainId]
    : undefined;
  const networkClientId = getNetworkClientId(networkConfiguration);
  const shouldUseEIP1559FeeLogic = useSelector((state: RootState) =>
    checkNetworkAndAccountSupports1559(state, networkClientId ?? ''),
  );
  const nativeConversionRate = useSelector((state: RootState) =>
    isStrictHexString(sourceChainId)
      ? selectConversionRateByChainId(state, sourceChainId, true)
      : undefined,
  );
  const fiatFormatter = useFiatFormatter();
  const [feeEstimateState, setFeeEstimateState] = useState<FeeEstimateState>({
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    setFeeEstimateState({ status: 'loading' });

    async function estimateUpgradeFee() {
      try {
        const upgradeStatus = await getEIP7702AccountUpgradeStatus(
          address,
          networkConfiguration,
        );
        if (!isActive) return;

        if (!upgradeStatus.isUpgradeRequired) {
          setFeeEstimateState({ status: 'not-required' });
          return;
        }

        if (!networkClientId || !networkConfiguration) {
          throw new Error(
            'Network configuration is required for fee estimation',
          );
        }

        const transactionParams = createEIP7702UpgradeTransactionParams(
          upgradeStatus.address,
          upgradeStatus.upgradeContractAddress,
        );
        const [
          gasEstimate,
          gasFeeEstimate,
          layer1GasFee,
          gasFeeControllerEstimate,
        ] = await Promise.all([
          Engine.context.TransactionController.estimateGas(
            transactionParams,
            networkClientId,
          ),
          Engine.context.TransactionController.estimateGasFee({
            transactionParams,
            chainId: networkConfiguration.chainId,
            networkClientId,
          }),
          Engine.context.TransactionController.getLayer1GasFee({
            transactionParams,
            chainId: networkConfiguration.chainId,
            networkClientId,
          }),
          Engine.context.GasFeeController.fetchGasFeeEstimates({
            networkClientId,
          }),
        ]);
        const gasValues = getGasValues(
          gasFeeEstimate.estimates,
          shouldUseEIP1559FeeLogic,
        );

        if (isActive) {
          setFeeEstimateState({
            status: 'ready',
            inputs: {
              ...gasValues,
              estimatedBaseFee: getEstimatedBaseFee(
                gasFeeControllerEstimate.gasFeeEstimates,
              ),
              gas: gasEstimate.gas,
              layer1GasFee,
              shouldUseEIP1559FeeLogic,
            },
          });
        }
      } catch {
        if (isActive) setFeeEstimateState({ status: 'error' });
      }
    }

    estimateUpgradeFee();

    return () => {
      isActive = false;
    };
  }, [
    address,
    networkClientId,
    networkConfiguration,
    shouldUseEIP1559FeeLogic,
  ]);

  return useMemo(() => {
    if (feeEstimateState.status !== 'ready') return feeEstimateState;

    const shouldHideFiat =
      (isStrictHexString(sourceChainId) &&
        isTestNet(sourceChainId) &&
        !showFiatOnTestnets) ||
      nativeConversionRate === null ||
      nativeConversionRate === undefined;
    const fees = calculateGasEstimate({
      ...feeEstimateState.inputs,
      getFeesFromHexFn: (hexFee) =>
        getFeesFromHex({
          hexFee,
          nativeConversionRate,
          nativeCurrency: networkConfiguration?.nativeCurrency,
          fiatFormatter,
          shouldHideFiat,
        }),
    });

    return {
      status: 'ready',
      fee: fees.currentCurrencyFee ?? fees.nativeCurrencyFee ?? '--',
    };
  }, [
    feeEstimateState,
    fiatFormatter,
    nativeConversionRate,
    networkConfiguration?.nativeCurrency,
    showFiatOnTestnets,
    sourceChainId,
  ]);
}
