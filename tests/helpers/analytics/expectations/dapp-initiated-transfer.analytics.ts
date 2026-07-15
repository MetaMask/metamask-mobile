import type { AnalyticsExpectations } from '../../../framework';
import { commonTransactionPropertiesAndTypes } from '../common-transaction-properties';

const TRANSACTION_ADDED = 'Transaction Added';
const TRANSACTION_SUBMITTED = 'Transaction Submitted';
const TRANSACTION_APPROVED = 'Transaction Approved';
const TRANSACTION_FINALIZED = 'Transaction Finalized';

const transactionEventNames = [
  TRANSACTION_ADDED,
  TRANSACTION_SUBMITTED,
  TRANSACTION_APPROVED,
  TRANSACTION_FINALIZED,
];

const simulationLifecycleProperties: Record<
  string,
  string | ((value: unknown) => boolean)
> = {
  ...commonTransactionPropertiesAndTypes,
  simulation_response: 'string',
  simulation_latency: 'number',
  simulation_receiving_assets_quantity: 'number',
  simulation_receiving_assets_type: 'array',
  simulation_receiving_assets_value: 'array',
  simulation_sending_assets_quantity: 'number',
  simulation_sending_assets_type: 'array',
  simulation_sending_assets_value: 'array',
  asset_type: 'string',
  simulation_receiving_assets_total_value: 'number',
  simulation_sending_assets_total_value: 'number',
};

const transactionFinalizedProperties: Record<
  string,
  string | ((value: unknown) => boolean)
> = {
  ...simulationLifecycleProperties,
  rpc_domain: 'string',
};

/**
 * Expected MetaMetrics payloads after confirming a dapp-initiated native transfer (local Anvil).
 */
export const dappInitiatedTransferAnalyticsExpectations: AnalyticsExpectations =
  {
    eventNames: [...transactionEventNames],
    expectedTotalCount: transactionEventNames.length,
    events: [
      {
        name: TRANSACTION_ADDED,
        requiredProperties: { ...commonTransactionPropertiesAndTypes },
      },
      {
        name: TRANSACTION_SUBMITTED,
        requiredProperties: { ...simulationLifecycleProperties },
      },
      {
        name: TRANSACTION_APPROVED,
        requiredProperties: { ...simulationLifecycleProperties },
      },
      {
        name: TRANSACTION_FINALIZED,
        requiredProperties: { ...transactionFinalizedProperties },
      },
    ],
  };
