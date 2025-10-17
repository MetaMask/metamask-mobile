import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  SimulationData,
  SimulationErrorCode,
} from '@metamask/transaction-controller';

import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { updateConfirmationMetric } from '../../../core/redux/slices/confirmationMetrics';
import {
  UseDisplayNameRequest,
  UseDisplayNameResponse,
  useDisplayNames,
} from '../../hooks/DisplayName/useDisplayName';
import { NameType } from '../../UI/Name/Name.types';
import useLoadingTime from './useLoadingTime';
import { calculateTotalFiat } from './FiatDisplay/FiatDisplay';
import { BalanceChange } from './types';

export interface UseSimulationMetricsProps {
  balanceChanges: BalanceChange[];
  loading: boolean;
  simulationData?: SimulationData;
  transactionId: string;
  enableMetrics: boolean;
}

export enum SimulationResponseType {
  Failed = 'failed',
  Reverted = 'transaction_revert',
  NoChanges = 'no_balance_change',
  Changes = 'balance_change',
  InProgress = 'simulation_in_progress',
}

export enum FiatType {
  Available = 'available',
  NotAvailable = 'not_available',
}

export function useSimulationMetrics({
  balanceChanges,
  loading,
  simulationData,
  transactionId,
  enableMetrics,
}: UseSimulationMetricsProps) {
  const { loadingTime, setLoadingComplete } = useLoadingTime();
  const dispatch = useDispatch();

  if (!loading) {
    setLoadingComplete();
  }

  const displayNameRequests: UseDisplayNameRequest[] = balanceChanges.map(
    ({ asset }) => ({
      value: asset.address ?? '',
      type: NameType.EthereumAddress,
      preferContractSymbol: true,
      variation: asset.chainId,
    }),
  );

  const displayNames = useDisplayNames(displayNameRequests);

  const displayNamesByAddress = displayNames.reduce(
    (acc, displayNameResponse, index) => ({
      ...acc,
      [balanceChanges[index].asset.address ?? '']: displayNameResponse,
    }),
    {} as { [address: string]: UseDisplayNameResponse },
  );

  useIncompleteAssetEvent(balanceChanges, displayNamesByAddress);

  const receivingAssets = balanceChanges.filter(
    (change) => !change.amount.isNegative(),
  );

  const sendingAssets = balanceChanges.filter((change) =>
    change.amount.isNegative(),
  );

  const simulationResponse = getSimulationResponseType(simulationData);
  const simulationLatency = loadingTime;

  const properties = {
    simulation_response: simulationResponse,
    simulation_latency: simulationLatency,
    ...getProperties(receivingAssets, 'simulation_receiving_assets_'),
    ...getProperties(sendingAssets, 'simulation_sending_assets_'),
  };

  const sensitiveProperties = {
    ...getSensitiveProperties(receivingAssets, 'simulation_receiving_assets_'),
    ...getSensitiveProperties(sendingAssets, 'simulation_sending_assets_'),
  };

  const params = { properties, sensitiveProperties };

  const shouldSkipMetrics =
    !enableMetrics ||
    [
      SimulationErrorCode.ChainNotSupported,
      SimulationErrorCode.Disabled,
    ].includes(simulationData?.error?.code as SimulationErrorCode);

  useEffect(() => {
    if (shouldSkipMetrics) {
      return;
    }

    dispatch(updateConfirmationMetric({ id: transactionId, params }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSkipMetrics, transactionId, JSON.stringify(params), dispatch]);
}

function useIncompleteAssetEvent(
  balanceChanges: BalanceChange[],
  displayNamesByAddress: { [address: string]: UseDisplayNameResponse },
) {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [processedAssets, setProcessedAssets] = useState<string[]>([]);

  for (const change of balanceChanges) {
    const assetAddress = change.asset.address ?? '';
    const displayName = displayNamesByAddress[assetAddress];

    const isIncomplete = change.asset.address && !change.fiatAmount;

    const isProcessed = processedAssets.includes(assetAddress);

    if (!isIncomplete || isProcessed) {
      continue;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.INCOMPLETE_ASSET_DISPLAYED)
        .addProperties({
          asset_address: change.asset.address,
          // Petnames doesn't exist in mobile so we set as unknown for now
          asset_petname: 'unknown',
          asset_symbol: displayName.contractDisplayName,
          asset_type: change.asset.type,
          fiat_conversion_available: change.fiatAmount
            ? FiatType.Available
            : FiatType.NotAvailable,
          location: 'confirmation',
        })
        .build(),
    );

    setProcessedAssets([...processedAssets, assetAddress]);
  }
}

function getProperties(changes: BalanceChange[], prefix: string) {
  const quantity = changes.length;

  const type = unique(changes.map((change) => change.asset.type));

  const value = unique(
    changes.map((change) =>
      change.fiatAmount ? FiatType.Available : FiatType.NotAvailable,
    ),
  );

  return getPrefixProperties({ quantity, type, value }, prefix);
}

function getSensitiveProperties(changes: BalanceChange[], prefix: string) {
  const fiatAmounts = changes.map((change) => change.usdAmount);
  const totalFiat = calculateTotalFiat(fiatAmounts);
  const totalValue = totalFiat ? totalFiat.abs().toNumber() : undefined;

  return getPrefixProperties({ total_value: totalValue }, prefix);
}

// TODO: Replace `any` with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPrefixProperties(properties: Record<string, any>, prefix: string) {
  return Object.entries(properties).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [`${prefix}${key}`]: value,
    }),
    {},
  );
}

function getSimulationResponseType(
  simulationData?: SimulationData,
): SimulationResponseType {
  if (!simulationData) {
    return SimulationResponseType.InProgress;
  }

  if (simulationData.error?.code === SimulationErrorCode.Reverted) {
    return SimulationResponseType.Reverted;
  }

  if (simulationData.error) {
    return SimulationResponseType.Failed;
  }

  if (
    !simulationData?.nativeBalanceChange &&
    !simulationData?.tokenBalanceChanges?.length
  ) {
    return SimulationResponseType.NoChanges;
  }

  return SimulationResponseType.Changes;
}

function unique<T>(list: T[]): T[] {
  return Array.from(new Set(list));
}
