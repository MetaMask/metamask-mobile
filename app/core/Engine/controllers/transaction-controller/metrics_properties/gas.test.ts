import {
  TransactionMeta,
  GasFeeEstimateType,
} from '@metamask/transaction-controller';

import { getGasMetricsProperties } from './gas';
import { TransactionMetricsBuilderRequest } from '../types';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { RootState } from '../../../../../reducers';

const createMockState = (
  balance: string = '0x100000000000000000',
  chainId: string = '0x1',
  address: string = '0xuser',
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTrackerController: {
          accountsByChainId: {
            [chainId]: {
              [address.toLowerCase()]: { balance },
            },
          },
        },
      },
    },
  }) as unknown as RootState;

const createMockRequest = (
  overrides: Partial<TransactionMeta> = {},
  state: RootState = createMockState(),
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
  transactionMeta: {
    chainId: '0x1',
    txParams: { from: '0xuser', gas: '0x5208', gasPrice: '0x1' },
    ...overrides,
  } as TransactionMeta,
  allTransactions: [],
  getUIMetrics: jest.fn(),
  getState: jest.fn(
    () => state,
  ) as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
});

describe('getGasMetricsProperties', () => {
  it('returns gas_estimation_failed as true when gasFeeEstimatesLoaded is false', () => {
    const request = createMockRequest({ gasFeeEstimatesLoaded: false });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_estimation_failed).toBe(true);
  });

  it('returns gas_estimation_failed as false when gasFeeEstimatesLoaded is true', () => {
    const request = createMockRequest({ gasFeeEstimatesLoaded: true });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_estimation_failed).toBe(false);
  });

  it('includes low/medium/high options for FeeMarket estimate type', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: true,
      gasFeeEstimates: {
        type: GasFeeEstimateType.FeeMarket,
      } as TransactionMeta['gasFeeEstimates'],
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toContain('low');
    expect(result.properties.gas_fee_presented).toContain('medium');
    expect(result.properties.gas_fee_presented).toContain('high');
  });

  it('includes network_proposed for GasPrice estimate type', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: true,
      gasFeeEstimates: {
        type: GasFeeEstimateType.GasPrice,
      } as TransactionMeta['gasFeeEstimates'],
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toContain('network_proposed');
  });

  it('includes dapp_proposed when dappSuggestedGasFees exists', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: true,
      dappSuggestedGasFees: {
        gasPrice: '0x1',
      } as TransactionMeta['dappSuggestedGasFees'],
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toContain('dapp_proposed');
  });

  it('returns gas_fee_selected from userFeeLevel', () => {
    const request = createMockRequest({ userFeeLevel: 'medium' });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_selected).toBe('medium');
  });

  it('returns gas_payment_tokens_available from gasFeeTokens', () => {
    const request = createMockRequest({
      gasFeeTokens: [
        { symbol: 'ETH', tokenAddress: '0xeth' },
        { symbol: 'USDC', tokenAddress: '0xusdc' },
      ] as unknown as TransactionMeta['gasFeeTokens'],
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_payment_tokens_available).toEqual([
      'ETH',
      'USDC',
    ]);
  });

  it('returns gas_insufficient_native_asset as true when balance is insufficient', () => {
    const state = createMockState('0x1');
    const request = createMockRequest(
      {
        txParams: {
          from: '0xuser',
          gas: '0x5208',
          gasPrice: '0x100000000000000000',
        },
      },
      state,
    );

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_insufficient_native_asset).toBe(true);
  });

  it('returns gas_insufficient_native_asset as false when balance is sufficient', () => {
    const state = createMockState('0x100000000000000000');
    const request = createMockRequest(
      {
        txParams: { from: '0xuser', gas: '0x1', gasPrice: '0x1' },
      },
      state,
    );

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_insufficient_native_asset).toBe(false);
  });
});
