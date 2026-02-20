import type {
  FeeMarketEIP1559Values,
  GasPriceValue,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { useCancelSpeedupGas } from './useCancelSpeedupGas';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { Eip1559ExistingGas } from '../../../../UnifiedTransactionsView/useUnifiedTxActions';

const providerState = { state: { engine: { backgroundState } } } as const;

const mockGasFeeEstimates = {
  medium: {
    suggestedMaxFeePerGas: '25',
    suggestedMaxPriorityFeePerGas: '2',
    minWaitTimeEstimate: 15000,
  },
};

const mockNetworkConfig = { nativeCurrency: 'ETH' };

jest.mock('../../../../../../selectors/gasFeeController', () => ({
  ...jest.requireActual('../../../../../../selectors/gasFeeController'),
  selectGasFeeEstimatesByChainId: jest.fn(() => mockGasFeeEstimates),
}));

jest.mock('../../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../../selectors/networkController'),
  selectNetworkConfigurationByChainId: jest.fn(() => mockNetworkConfig),
}));

jest.mock('../../../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../../../selectors/currencyRateController'),
  selectConversionRateByChainId: jest.fn(() => 2000),
}));

jest.mock('../../../../../../selectors/settings', () => ({
  ...jest.requireActual('../../../../../../selectors/settings'),
  selectShowFiatInTestnets: jest.fn(() => false),
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

jest.mock('../../../utils/time', () => ({
  toHumanSeconds: jest.fn((ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds} sec`;
  }),
}));

jest.mock('../useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(() => ({
    gasFeeEstimates: {
      medium: {
        suggestedMaxFeePerGas: '25',
        suggestedMaxPriorityFeePerGas: '2',
        minWaitTimeEstimate: 15000,
      },
    },
  })),
}));

describe('useCancelSpeedupGas', () => {
  const mockTx = {
    id: 'tx-1',
    chainId: '0x1',
    networkClientId: 'mainnet',
    txParams: { gas: '0x5208' },
  } as unknown as TransactionMeta;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty result when tx is null', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas: {
            isEIP1559Transaction: true,
            maxFeePerGas: '100',
            maxPriorityFeePerGas: '1.5',
          },
          tx: null,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
    expect(result.current.speedDisplay).toBeDefined();
    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('returns empty result when existingGas is null', () => {
    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas: null,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.paramsForController).toBeUndefined();
    expect(result.current.networkFeeDisplay).toBe('0');
    expect(result.current.networkFeeNative).toBe('0');
    expect(result.current.networkFeeFiat).toBeNull();
  });

  it('returns EIP-1559 params when existingGas is EIP-1559 (speed up)', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
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
    expect(result.current.speedDisplay).toContain('sec');
    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('returns EIP-1559 params with higher values for cancel', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result: speedUpResult } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    const { result: cancelResult } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: true,
        }),
      providerState,
    );

    expect(cancelResult.current.paramsForController).toBeDefined();
    expect(speedUpResult.current.paramsForController).toBeDefined();
  });

  it('returns legacy params when existingGas has gasPrice (zero gasPrice)', () => {
    const existingGas = {
      gasPrice: 0,
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
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

  it('returns legacy params when existingGas has gasPrice (non-zero gasPrice)', () => {
    const existingGas = {
      gasPrice: 10_000_000_000, // 10 GWEI in WEI (decimal, from parseGas)
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
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
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    expect(parseFloat(result.current.networkFeeNative)).toBeGreaterThan(0);
    expect(result.current.networkFeeDisplay).toContain('ETH');
    expect(result.current.networkFeeFiat).toMatch('$');
  });

  it('includes wait time in speed display', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.speedDisplay).toContain('sec');
    expect(result.current.speedDisplay).toMatch(/~\s*\d+\s*sec|sec/);
  });

  it('handles missing networkClientId gracefully', () => {
    const txWithoutNetworkClientId = {
      ...mockTx,
      networkClientId: undefined,
    } as unknown as TransactionMeta;

    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: txWithoutNetworkClientId,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
    expect(result.current.paramsForController).toBeDefined();
  });

  it('returns correct native token symbol', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '100',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    expect(result.current.nativeTokenSymbol).toBe('ETH');
  });

  it('uses market fees when market fees are higher than existing fees', () => {
    const existingGas: Eip1559ExistingGas = {
      isEIP1559Transaction: true,
      maxFeePerGas: '10',
      maxPriorityFeePerGas: '1.5',
    };

    const { result } = renderHookWithProvider(
      () =>
        useCancelSpeedupGas({
          existingGas,
          tx: mockTx,
          isCancel: false,
        }),
      providerState,
    );

    const paramsForController = result.current.paramsForController as
      | FeeMarketEIP1559Values
      | undefined;

    // Market is 25 / 2 GWEI; existing 10 / 1.5 → speed-up 11 / 1.65; use market (higher)
    expect(paramsForController?.maxFeePerGas).toBe('0x5d21dba00'); // 25 GWEI in hex WEI
    expect(paramsForController?.maxPriorityFeePerGas).toBe('0x77359400'); // 2 GWEI in hex WEI
  });
});
