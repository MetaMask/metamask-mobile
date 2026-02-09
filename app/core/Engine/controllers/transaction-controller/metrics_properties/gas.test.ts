import { TransactionMeta } from '@metamask/transaction-controller';
import { getNativeTokenAddress } from '@metamask/assets-controllers';

import { getGasMetricsProperties } from './gas';
import { TransactionMetricsBuilderRequest } from '../types';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { RootState } from '../../../../../reducers';

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: jest.fn(),
}));

const mockGetNativeTokenAddress = getNativeTokenAddress as jest.MockedFunction<
  typeof getNativeTokenAddress
>;

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
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetNativeTokenAddress.mockReturnValue(
      '0x0000000000000000000000000000000000000000',
    );
  });

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

  it('returns medium as gas_fee_presented when gasFeeEstimatesLoaded is true and no dapp suggested fees', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: true,
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toBe('medium');
  });

  it('returns dapp_proposed as gas_fee_presented when dappSuggestedGasFees exists', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: true,
      dappSuggestedGasFees: {
        gasPrice: '0x1',
      } as TransactionMeta['dappSuggestedGasFees'],
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toBe('dapp_proposed');
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

  it('returns n_a as gas_fee_presented when no dapp suggested fees and estimates not loaded', () => {
    const request = createMockRequest({
      gasFeeEstimatesLoaded: false,
      dappSuggestedGasFees: undefined,
    });

    const result = getGasMetricsProperties(request);

    expect(result.properties.gas_fee_presented).toBe('n_a');
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
