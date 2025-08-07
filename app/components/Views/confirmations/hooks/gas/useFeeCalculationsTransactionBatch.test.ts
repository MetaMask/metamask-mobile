import {
  GasFeeEstimateLevel,
  GasFeeEstimateType,
  type TransactionBatchMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { cloneDeep } from 'lodash';
import { toHex } from 'viem';
import { stakingDepositConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useFeeCalculationsTransactionBatch } from './useFeeCalculationsTransactionBatch';

const GWEI_IN_WEI = 10 ** 9;

jest.mock('../../../../../util/networks', () => ({
  isTestNet: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

jest.mock('../../utils/token', () => ({
  ...jest.requireActual('../../../../utils/token'),
  fetchErc20Decimals: jest.fn().mockResolvedValue(18),
}));

describe('useFeeCalculationsTransactionBatch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Create mock transaction batch meta
  const mockTransactionBatchMeta: TransactionBatchMeta = {
    id: 'test-batch-1',
    from: '0x1234567890123456789012345678901234567890' as Hex,
    status: TransactionStatus.unapproved,
    chainId: toHex(1),
    gas: toHex(21000),
    networkClientId: 'mainnet',
    gasFeeEstimates: {
      type: GasFeeEstimateType.FeeMarket,
      [GasFeeEstimateLevel.Low]: {
        maxFeePerGas: toHex(1 * GWEI_IN_WEI),
        maxPriorityFeePerGas: toHex(1 * GWEI_IN_WEI),
      },
      [GasFeeEstimateLevel.Medium]: {
        maxFeePerGas: toHex(2 * GWEI_IN_WEI),
        maxPriorityFeePerGas: toHex(2 * GWEI_IN_WEI),
      },
      [GasFeeEstimateLevel.High]: {
        maxFeePerGas: toHex(3 * GWEI_IN_WEI),
        maxPriorityFeePerGas: toHex(3 * GWEI_IN_WEI),
      },
    },
    transactions: [],
  };

  const mockTransactionBatchMetaGasPrice: TransactionBatchMeta = {
    ...mockTransactionBatchMeta,
    gasFeeEstimates: {
      type: GasFeeEstimateType.GasPrice,
      gasPrice: toHex(2 * GWEI_IN_WEI),
    },
  };

  const mockTransactionBatchMetaLegacy: TransactionBatchMeta = {
    ...mockTransactionBatchMeta,
    gasFeeEstimates: {
      type: GasFeeEstimateType.Legacy,
      [GasFeeEstimateLevel.Low]: toHex(1 * GWEI_IN_WEI),
      [GasFeeEstimateLevel.Medium]: toHex(2 * GWEI_IN_WEI),
      [GasFeeEstimateLevel.High]: toHex(3 * GWEI_IN_WEI),
    },
  };

  it('returns fee calculations for FeeMarket type', () => {
    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(mockTransactionBatchMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('$0.15');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x2632e314a000');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns fee calculations for GasPrice type', () => {
    const { result } = renderHookWithProvider(
      () =>
        useFeeCalculationsTransactionBatch(mockTransactionBatchMetaGasPrice),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('$0.15');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x2632e314a000');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns fee calculations for Legacy type', () => {
    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(mockTransactionBatchMetaLegacy),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('$0.15');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x2632e314a000');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns fee calculations less than $0.01', () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      {
        conversionDate: 1732887955.694,
        conversionRate: 80,
        usdConversionRate: 80,
      };

    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(mockTransactionBatchMeta),
      {
        state: clonedStakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('< $0.01');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x2632e314a000');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('returns null as estimatedFeeFiat if conversion rate is not available', () => {
    const clonedStakingDepositConfirmationState = cloneDeep(
      stakingDepositConfirmationState,
    );

    // No type is exported for CurrencyRate, so we need to cast it to the correct type
    clonedStakingDepositConfirmationState.engine.backgroundState.CurrencyRateController.currencyRates.ETH =
      null as unknown as {
        conversionDate: number;
        conversionRate: number;
        usdConversionRate: number;
      };

    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(mockTransactionBatchMeta),
      {
        state: clonedStakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe(null);
    expect(result.current.estimatedFeeNative).toBe(null);
    expect(result.current.preciseNativeFeeInHex).toBe(null);
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('handles batch meta with no gas limit', () => {
    const batchMetaWithoutGas = {
      ...mockTransactionBatchMeta,
      gas: undefined as unknown as string,
    };

    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(batchMetaWithoutGas),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('< $0.01');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x0');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('handles batch meta with no gasFeeEstimates', () => {
    const batchMetaWithoutEstimates = {
      ...mockTransactionBatchMeta,
      gasFeeEstimates: undefined,
    };

    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(batchMetaWithoutEstimates),
      {
        state: stakingDepositConfirmationState,
      },
    );

    expect(result.current.estimatedFeeFiat).toBe('< $0.01');
    expect(result.current.estimatedFeeNative).toBe('0 ETH');
    expect(result.current.preciseNativeFeeInHex).toBe('0x0');
    expect(result.current.calculateGasEstimate).toBeDefined();
  });

  it('uses calculateGasEstimate callback correctly', () => {
    const { result } = renderHookWithProvider(
      () => useFeeCalculationsTransactionBatch(mockTransactionBatchMeta),
      {
        state: stakingDepositConfirmationState,
      },
    );

    const gasEstimate = result.current.calculateGasEstimate({
      feePerGas: '0x5572e9c22d00',
      priorityFeePerGas: toHex(2 * GWEI_IN_WEI),
      gas: '0x5208',
      shouldUseEIP1559FeeLogic: true,
      gasPrice: '0x5572e9c22d00',
    });

    expect(gasEstimate).toBeDefined();
    expect(gasEstimate.nativeCurrencyFee).toBeDefined();
    expect(gasEstimate.currentCurrencyFee).toBeDefined();
    expect(gasEstimate.preciseNativeFeeInHex).toBeDefined();
  });
});
