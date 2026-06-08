import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { getSimulationValuesProperties } from './simulation-values';
import { TransactionMetricsBuilder } from '../types';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';

describe('getSimulationValuesProperties', () => {
  const getStateMock: jest.MockedFn<
    Parameters<TransactionMetricsBuilder>[0]['getState']
  > = jest.fn();

  const getUIMetricsMock: jest.MockedFn<
    Parameters<TransactionMetricsBuilder>[0]['getUIMetrics']
  > = jest.fn();

  let request: Parameters<TransactionMetricsBuilder>[0];

  beforeEach(() => {
    jest.resetAllMocks();

    request = {
      eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
      transactionMeta: {
        id: 'tx-1',
        txParams: { nonce: '0x1' },
      } as TransactionMeta,
      allTransactions: [],
      getUIMetrics: getUIMetricsMock,
      getState: getStateMock,
      initMessenger: {} as never,
      smartTransactionsController: {} as never,
    };
  });

  it('returns empty properties when assetsFiatValues is not present', () => {
    request.transactionMeta.type = TransactionType.swap;

    const result = getSimulationValuesProperties(request);

    expect(result).toStrictEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns both sending and receiving values when present', () => {
    request.transactionMeta = {
      ...request.transactionMeta,
      assetsFiatValues: {
        sending: '100.50',
        receiving: '99.75',
      },
    } as TransactionMeta;

    const result = getSimulationValuesProperties(request);

    expect(result).toStrictEqual({
      properties: {
        simulation_sending_assets_total_value: 100.5,
        simulation_receiving_assets_total_value: 99.75,
      },
      sensitiveProperties: {},
    });
  });

  it('returns only sending value when receiving is not provided', () => {
    request.transactionMeta = {
      ...request.transactionMeta,
      assetsFiatValues: {
        sending: '50',
      },
    } as TransactionMeta;

    const result = getSimulationValuesProperties(request);

    expect(result).toStrictEqual({
      properties: {
        simulation_sending_assets_total_value: 50,
      },
      sensitiveProperties: {},
    });
  });

  it('returns only receiving value when sending is not provided', () => {
    request.transactionMeta = {
      ...request.transactionMeta,
      assetsFiatValues: {
        receiving: '75.25',
      },
    } as TransactionMeta;

    const result = getSimulationValuesProperties(request);

    expect(result).toStrictEqual({
      properties: {
        simulation_receiving_assets_total_value: 75.25,
      },
      sensitiveProperties: {},
    });
  });

  it('returns values regardless of transaction type', () => {
    request.transactionMeta = {
      ...request.transactionMeta,
      type: TransactionType.simpleSend,
      assetsFiatValues: {
        sending: '100',
        receiving: '100',
      },
    } as TransactionMeta;

    const result = getSimulationValuesProperties(request);

    expect(result).toStrictEqual({
      properties: {
        simulation_sending_assets_total_value: 100,
        simulation_receiving_assets_total_value: 100,
      },
      sensitiveProperties: {},
    });
  });
});
