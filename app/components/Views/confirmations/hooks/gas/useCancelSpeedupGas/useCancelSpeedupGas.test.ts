import {
  TransactionStatus,
  GasFeeEstimateLevel,
  TransactionStatus,
  UserFeeLevel,
  type FeeMarketEIP1559Values,
  type GasPriceValue,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  getBumpParamsForCancelSpeedup,
  useCancelSpeedupGas,
  type BumpParamsResult,
} from './useCancelSpeedupGas';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useFeeCalculations } from '../useFeeCalculations';
import type { GasFeeEstimatesInput } from '../../../../../../util/confirmation/gas';

const providerState = { state: { engine: { backgroundState } } } as const;

function buildStateWithTransaction(tx: TransactionMeta) {
  const bg = backgroundState as Record<string, unknown>;
  const tc = (bg.TransactionController ?? {}) as Record<string, unknown>;
  return {
    state: {
      engine: {
        backgroundState: {
          ...bg,
          TransactionController: {
            ...tc,
            transactions: [tx],
          },
        },
      },
    },
  };
}

const mockNetworkConfig = { nativeCurrency: 'ETH' };

const mockFeeCalculations = {
  estimatedFeeNative: '0.001',
  estimatedFeeFiat: '$2.00',
  estimatedFeeFiatPrecise: null,
  preciseNativeFeeInHex: null,
  calculateGasEstimate: jest.fn(),
  maxFeeFiat: null,
  maxFeeNative: null,
  maxFeeNativePrecise: null,
  maxFeeNativeHex: null,
};

jest.mock('../useFeeCalculations', () => ({
  useFeeCalculations: jest.fn(() => mockFeeCalculations),
}));

jest.mock('../../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../../selectors/networkController'),
  selectNetworkConfigurationByChainId: jest.fn(() => mockNetworkConfig),
}));

jest.mock('../../../../../../selectors/confirmTransaction', () => ({
  ...jest.requireActual('../../../../../../selectors/confirmTransaction'),
  selectGasFeeEstimates: jest.fn(() => ({
    medium: { suggestedMaxFeePerGas: '25' },
  })),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../../../selectors/currencyRateController'),
  selectConversionRateByChainId: jest.fn(() => 2000),
}));

jest.mock('../../../../../../selectors/settings', () => ({
  ...jest.requireActual('../../../../../../selectors/settings'),
  selectShowFiatOnTestnets: jest.fn(() => false),
}));

jest.mock(
  '../../../../../../components/UI/SimulationDetails/FiatDisplay/useFiatFormatter',
  () => ({
    __esModule: true,
    default: () => (amount: string | number) => `$${Number(amount).toFixed(2)}`,
  }),
);

jest.mock('../../../utils/gas', () => ({
  getFeesFromHex: jest.fn(() => ({
    currentCurrencyFee: '$50.00',
    nativeCurrencyFee: '0.025',
    preciseCurrentCurrencyFee: '$50.00',
    preciseNativeCurrencyFee: '0.025',
    preciseNativeFeeInHex: '0x56bc75e2d630eb20000',
  })),
}));

describe('useCancelSpeedupGas', () => {
  const mockTxEip1559 = {
    id: 'tx-1',
    chainId: '0x1',
    networkClientId: 'mainnet',
    txParams: {
      gas: '0x5208',
      maxFeePerGas: '0x174876e800',
      maxPriorityFeePerGas: '0x59682f00',
    },
  } as unknown as TransactionMeta;

  const mockTxLegacy = {
    id: 'tx-2',
    chainId: '0x1',
    networkClientId: 'mainnet',
    txParams: { gas: '0x5208', gasPrice: '0x0' },
  } as unknown as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty result when txId is null', () => {
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ txId: null }),
      providerState,
    );

    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
    expect(result.current.nativeTokenSymbol).toBe('ETH');
    expect(result.current.isInitialGasReady).toBe(false);
    expect(result.current.isTransactionModifiable).toBe(false);
  });

  it('returns empty result when tx has no txParams', () => {
    const txNoParams = {
      id: 'tx-1',
      chainId: '0x1',
    } as unknown as TransactionMeta;
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ txId: 'tx-1' }),
      buildStateWithTransaction(txNoParams),
    );

    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
  });

  it('returns EIP-1559 params derived from tx.txParams (speed up)', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(mockTxEip1559),
    );

    expect(result.current.paramsForController).toBeDefined();
    const eip1559Params = result.current.paramsForController as
      | FeeMarketEIP1559Values
      | undefined;
    expect(eip1559Params?.maxFeePerGas).toBeDefined();
    expect(eip1559Params?.maxPriorityFeePerGas).toBeDefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
    expect(result.current.networkFeeNative).toMatch(/\d+\.?\d*/);
    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('returns legacy params when tx.txParams has gasPrice (zero gasPrice)', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-2',
        }),
      buildStateWithTransaction(mockTxLegacy),
    );

    expect(result.current.paramsForController).toBeDefined();
    const legacyParams = result.current.paramsForController as
      | GasPriceValue
      | undefined;
    expect(legacyParams?.gasPrice).toBeDefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
    expect(result.current.networkFeeFiat).toBeDefined();
  });

  it('returns legacy params when tx.txParams has gasPrice (non-zero gasPrice)', () => {
    const txWithGasPrice = {
      ...mockTxLegacy,
      txParams: { gas: '0x5208', gasPrice: '0x2540be400' },
    } as unknown as TransactionMeta;

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-2',
        }),
      buildStateWithTransaction(txWithGasPrice),
    );

    expect(result.current.paramsForController).toBeDefined();
    const legacyParams = result.current.paramsForController as
      | GasPriceValue
      | undefined;
    expect(legacyParams?.gasPrice).toBeDefined();
    expect(result.current.networkFeeDisplay).toMatch(/\d+\.?\d* ETH/);
  });

  it('calculates network fee correctly for EIP-1559', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(mockTxEip1559),
    );

    expect(parseFloat(result.current.networkFeeNative)).toBeGreaterThan(0);
    expect(result.current.networkFeeDisplay).toContain('ETH');
    expect(result.current.networkFeeFiat).toMatch('$');
  });

  it('handles missing networkClientId gracefully', () => {
    const txWithoutNetworkClientId = {
      ...mockTxEip1559,
      networkClientId: undefined,
    } as unknown as TransactionMeta;

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(txWithoutNetworkClientId),
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
    expect(result.current.paramsForController).toBeDefined();
  });

  it('returns correct native token symbol', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(mockTxEip1559),
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('uses params from store for EIP-1559', () => {
    const tx10Gwei = {
      ...mockTxEip1559,
      txParams: {
        gas: '0x5208',
        maxFeePerGas: '0x2540be400',
        maxPriorityFeePerGas: '0x59682f00',
      },
    } as unknown as TransactionMeta;

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(tx10Gwei),
    );

    const paramsForController = result.current.paramsForController as
      | FeeMarketEIP1559Values
      | undefined;

    expect(paramsForController?.maxFeePerGas).toBeDefined();
    expect(paramsForController?.maxPriorityFeePerGas).toBeDefined();
  });

  it('calls useFeeCalculations with tx from store', () => {
    const mockUseFeeCalculations = jest.mocked(useFeeCalculations);

    renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(mockTxEip1559),
    );

    expect(mockUseFeeCalculations).toHaveBeenCalled();
    const [callArg] =
      mockUseFeeCalculations.mock.calls[
        mockUseFeeCalculations.mock.calls.length - 1
      ];
    expect(callArg).toMatchObject({
      id: 'tx-1',
      chainId: '0x1',
      txParams: expect.objectContaining({
        gas: '0x5208',
        maxFeePerGas: expect.any(String),
        maxPriorityFeePerGas: expect.any(String),
      }),
    });
  });

  it('uses fee display from useFeeCalculations when tx is in store', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          txId: 'tx-1',
        }),
      buildStateWithTransaction(mockTxEip1559),
    );

    expect(result.current.networkFeeNative).toBe(
      mockFeeCalculations.estimatedFeeNative,
    );
    expect(result.current.networkFeeFiat).toBe(
      mockFeeCalculations.estimatedFeeFiat,
    );
    expect(result.current.networkFeeDisplay).toContain(
      mockFeeCalculations.estimatedFeeNative,
    );
    expect(result.current.networkFeeDisplay).toContain('ETH');
  });

  it('returns isInitialGasReady=false when previousGas is not set', () => {
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ txId: 'tx-1' }),
      buildStateWithTransaction(mockTxEip1559),
    );
    expect(result.current.isInitialGasReady).toBe(false);
  });

  it('returns isInitialGasReady=true when previousGas is set', () => {
    const txWithPreviousGas = {
      ...mockTxEip1559,
      previousGas: {
        maxFeePerGas: '0x174876e800',
        maxPriorityFeePerGas: '0x59682f00',
        gasLimit: '0x5208',
      },
    } as unknown as TransactionMeta;
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ txId: 'tx-1' }),
      buildStateWithTransaction(txWithPreviousGas),
    );
    expect(result.current.isInitialGasReady).toBe(true);
  });

  describe('isTransactionModifiable', () => {
    it('returns false when txId is null (no tx)', () => {
      const { result } = renderHookWithProvider(
        () => useCancelSpeedupGas({ txId: null }),
        providerState,
      );
      expect(result.current.isTransactionModifiable).toBe(false);
    });

    it.each([TransactionStatus.unapproved, TransactionStatus.submitted])(
      'returns true when tx status is %s',
      (status) => {
        const tx = { ...mockTxEip1559, status } as unknown as TransactionMeta;
        const { result } = renderHookWithProvider(
          () => useCancelSpeedupGas({ txId: 'tx-1' }),
          buildStateWithTransaction(tx),
        );
        expect(result.current.isTransactionModifiable).toBe(true);
      },
    );

    it.each([
      TransactionStatus.confirmed,
      TransactionStatus.failed,
      TransactionStatus.dropped,
      TransactionStatus.rejected,
      TransactionStatus.approved,
      TransactionStatus.signed,
    ])('returns false when tx status is %s', (status) => {
      const tx = { ...mockTxEip1559, status } as unknown as TransactionMeta;
      const { result } = renderHookWithProvider(
        () => useCancelSpeedupGas({ txId: 'tx-1' }),
        buildStateWithTransaction(tx),
      );
      expect(result.current.isTransactionModifiable).toBe(false);
    });
  });
});

describe('getBumpParamsForCancelSpeedup', () => {
  const eip1559Tx = {
    id: 'tx-1',
    chainId: '0x1',
    txParams: {
      gas: '0x5208',
      maxFeePerGas: '0x174876e800',
      maxPriorityFeePerGas: '0x59682f00',
    },
  } as unknown as TransactionMeta;

  it('returns EIP-1559 params for speed up', () => {
    const result = getBumpParamsForCancelSpeedup(eip1559Tx, false);
    expect(result).toBeDefined();
    const { gasValues, userFeeLevel } = result as BumpParamsResult;
    expect((gasValues as FeeMarketEIP1559Values).maxFeePerGas).toBeDefined();
    expect(
      (gasValues as FeeMarketEIP1559Values).maxPriorityFeePerGas,
    ).toBeDefined();
    expect(userFeeLevel).toBe(UserFeeLevel.CUSTOM);
  });

  it('returns EIP-1559 params for cancel with same or higher values than speed up', () => {
    const speedUpResult = getBumpParamsForCancelSpeedup(eip1559Tx, false);
    const cancelResult = getBumpParamsForCancelSpeedup(eip1559Tx, true);
    expect(speedUpResult).toBeDefined();
    expect(cancelResult).toBeDefined();

    const speedUp = (speedUpResult as BumpParamsResult)
      .gasValues as FeeMarketEIP1559Values;
    const cancel = (cancelResult as BumpParamsResult)
      .gasValues as FeeMarketEIP1559Values;
    expect(parseInt(cancel.maxFeePerGas ?? '0', 16)).toBeGreaterThanOrEqual(
      parseInt(speedUp.maxFeePerGas ?? '0', 16),
    );
    expect(
      parseInt(cancel.maxPriorityFeePerGas ?? '0', 16),
    ).toBeGreaterThanOrEqual(parseInt(speedUp.maxPriorityFeePerGas ?? '0', 16));
  });

  it('returns legacy gasPrice when tx is legacy', () => {
    const tx = {
      id: 'tx-2',
      chainId: '0x1',
      txParams: { gas: '0x5208', gasPrice: '0x2540be400' },
    } as unknown as TransactionMeta;
    const result = getBumpParamsForCancelSpeedup(tx, false);
    expect(result).toBeDefined();
    const { gasValues, userFeeLevel } = result as BumpParamsResult;
    expect((gasValues as GasPriceValue).gasPrice).toBeDefined();
    expect(userFeeLevel).toBe(UserFeeLevel.CUSTOM);
  });

  it('returns undefined when tx has no txParams', () => {
    const tx = { id: 'tx-1', chainId: '0x1' } as unknown as TransactionMeta;
    const params = getBumpParamsForCancelSpeedup(tx, false);
    expect(params).toBeUndefined();
  });

  it('uses market estimate when medium > gas + 10% (EIP-1559)', () => {
    const lowGasTx = {
      id: 'tx-3',
      chainId: '0x1',
      txParams: {
        gas: '0x5208',
        maxFeePerGas: '0x3B9ACA00', // 1 GWEI
        maxPriorityFeePerGas: '0x3B9ACA00', // 1 GWEI
      },
    } as unknown as TransactionMeta;

    const estimates = {
      medium: {
        suggestedMaxFeePerGas: '50', // 50 GWEI >> 1.1 GWEI
        suggestedMaxPriorityFeePerGas: '2',
      },
    } as GasFeeEstimatesInput;

    const result = getBumpParamsForCancelSpeedup(
      lowGasTx,
      false,
      estimates,
    ) as BumpParamsResult;
    expect(result).toBeDefined();
    expect(result.userFeeLevel).toBe(GasFeeEstimateLevel.Medium);
    const gasValues = result.gasValues as FeeMarketEIP1559Values;
    expect(gasValues.maxFeePerGas).toBeDefined();
    expect(parseInt(gasValues.maxFeePerGas ?? '0', 16)).toBeGreaterThan(
      parseInt('0x3B9ACA00', 16) * 1.1,
    );
  });

  it('uses 10% bump when medium < gas + 10% (EIP-1559)', () => {
    const highGasTx = {
      id: 'tx-4',
      chainId: '0x1',
      txParams: {
        gas: '0x5208',
        maxFeePerGas: '0x174876e800', // 100 GWEI
        maxPriorityFeePerGas: '0x59682f00', // 1.5 GWEI
      },
    } as unknown as TransactionMeta;

    const estimates = {
      medium: {
        suggestedMaxFeePerGas: '25', // 25 GWEI << 110 GWEI (100 * 1.1)
        suggestedMaxPriorityFeePerGas: '2',
      },
    } as GasFeeEstimatesInput;

    const result = getBumpParamsForCancelSpeedup(
      highGasTx,
      false,
      estimates,
    ) as BumpParamsResult;
    expect(result).toBeDefined();
    expect(result.userFeeLevel).toBe(UserFeeLevel.CUSTOM);
    const gasValues = result.gasValues as FeeMarketEIP1559Values;
    const bumpedMaxFee = parseInt('0x174876e800', 16) * 1.1;
    const resultMaxFee = parseInt(gasValues.maxFeePerGas ?? '0', 16);
    expect(Math.abs(resultMaxFee - bumpedMaxFee)).toBeLessThan(1e9);
  });

  it('uses market estimate for legacy when medium > gas + 10%', () => {
    const lowGasLegacyTx = {
      id: 'tx-5',
      chainId: '0x1',
      txParams: {
        gas: '0x5208',
        gasPrice: '0x3B9ACA00', // 1 GWEI
      },
    } as unknown as TransactionMeta;

    const estimates = {
      medium: '50', // 50 GWEI >> 1.1 GWEI
    } as GasFeeEstimatesInput;

    const result = getBumpParamsForCancelSpeedup(
      lowGasLegacyTx,
      false,
      estimates,
    ) as BumpParamsResult;
    expect(result).toBeDefined();
    expect(result.userFeeLevel).toBe(GasFeeEstimateLevel.Medium);
    const gasValues = result.gasValues as GasPriceValue;
    expect(gasValues.gasPrice).toBeDefined();
    expect(parseInt(gasValues.gasPrice ?? '0', 16)).toBeGreaterThan(
      parseInt('0x3B9ACA00', 16) * 1.1,
    );
  });

  it('falls back to 10% bump when no gasFeeEstimates provided', () => {
    const result = getBumpParamsForCancelSpeedup(
      eip1559Tx,
      false,
    ) as BumpParamsResult;
    expect(result).toBeDefined();
    expect(result.userFeeLevel).toBe(UserFeeLevel.CUSTOM);
    expect(
      (result.gasValues as FeeMarketEIP1559Values).maxFeePerGas,
    ).toBeDefined();
  });
});
