import { TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';

/**
 * Gets simulation asset fiat values for transaction metrics from TransactionMeta.assetsFiatValues.
 *
 * @param transactionMeta - The transaction metadata
 * @returns Object with simulation_sending_assets_total_value and simulation_receiving_assets_total_value properties
 */
export const getSimulationValuesProperties: TransactionMetricsBuilder = ({
  transactionMeta,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const { assetsFiatValues } = transactionMeta;

  if (!assetsFiatValues) {
    return { properties, sensitiveProperties };
  }

  if (assetsFiatValues.sending !== undefined) {
    properties.simulation_sending_assets_total_value = Number(
      assetsFiatValues.sending,
    );
  }

  if (assetsFiatValues.receiving !== undefined) {
    properties.simulation_receiving_assets_total_value = Number(
      assetsFiatValues.receiving,
    );
  }

  return { properties, sensitiveProperties };
};
