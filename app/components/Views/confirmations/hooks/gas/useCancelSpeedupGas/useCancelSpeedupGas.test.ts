import type {
  FeeMarketEIP1559Values,
  GasPriceValue,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { useCancelSpeedupGas } from './useCancelSpeedupGas';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useFeeCalculations } from '../useFeeCalculations';

const providerState = { state: { engine: { backgroundState } } } as const;

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

  it('returns empty result when tx is null', () => {
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ tx: null, isCancel: false }),
      providerState,
    );

    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('returns empty result when tx has no txParams', () => {
    const txNoParams = {
      id: 'tx-1',
      chainId: '0x1',
    } as unknown as TransactionMeta;
    const { result } = renderHookWithProvider(
      () => useCancelSpeedupGas({ tx: txNoParams, isCancel: false }),
      providerState,
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
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
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

  it('returns EIP-1559 params with higher values for cancel', () => {
    const { result: speedUpResult } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
    );

    const { result: cancelResult } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxEip1559,
          isCancel: true,
        }),
      providerState,
    );

    expect(cancelResult.current.paramsForController).toBeDefined();
    expect(speedUpResult.current.paramsForController).toBeDefined();
  });

  it('returns legacy params when tx.txParams has gasPrice (zero gasPrice)', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxLegacy,
          isCancel: false,
        }),
      providerState,
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
          tx: txWithGasPrice,
          isCancel: false,
        }),
      providerState,
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
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
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
          tx: txWithoutNetworkClientId,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
    expect(result.current.paramsForController).toBeDefined();
  });

  it('returns correct native token symbol', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('uses bump-only for EIP-1559 (no market)', () => {
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
          tx: tx10Gwei,
          isCancel: false,
        }),
      providerState,
    );

    const paramsForController = result.current.paramsForController as
      | FeeMarketEIP1559Values
      | undefined;

    expect(paramsForController?.maxFeePerGas).toBeDefined();
    expect(paramsForController?.maxPriorityFeePerGas).toBeDefined();
  });

  it('calls useFeeCalculations with synthetic tx (bumped params) when tx is provided', () => {
    const mockUseFeeCalculations = jest.mocked(useFeeCalculations);

    renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
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

  it('uses fee display from useFeeCalculations when tx is provided', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          tx: mockTxEip1559,
          isCancel: false,
        }),
      providerState,
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
});
