import '../../_mocks_/initialState';
import { createBridgeTestState } from '../../testUtils';
import { useUnifiedSwapBridgeContext } from '.';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';

// Mock dependencies
jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn(),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectSourceToken: jest.fn(),
  selectDestToken: jest.fn(),
  selectSourceAmount: jest.fn(),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurations: jest.fn(),
}));

jest.mock('../../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

describe('useUnifiedSwapBridgeContext', () => {
  const mockSelectShouldUseSmartTransaction = jest.requireMock(
    '../../../../../selectors/smartTransactionsController',
  ).selectShouldUseSmartTransaction;

  const mockSelectSourceToken = jest.requireMock(
    '../../../../../core/redux/slices/bridge',
  ).selectSourceToken;

  const mockSelectDestToken = jest.requireMock(
    '../../../../../core/redux/slices/bridge',
  ).selectDestToken;

  const mockSelectSourceAmount = jest.requireMock(
    '../../../../../core/redux/slices/bridge',
  ).selectSourceAmount;

  const mockSelectCurrencyRates = jest.requireMock(
    '../../../../../selectors/currencyRateController',
  ).selectCurrencyRates;

  const mockSelectTokenMarketData = jest.requireMock(
    '../../../../../selectors/tokenRatesController',
  ).selectTokenMarketData;

  const mockSelectNetworkConfigurations = jest.requireMock(
    '../../../../../selectors/networkController',
  ).selectNetworkConfigurations;

  const mockSelectMultichainAssetsRates = jest.requireMock(
    '../../../../../selectors/multichain',
  ).selectMultichainAssetsRates;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock values
    mockSelectSourceAmount.mockReturnValue(undefined);
    mockSelectCurrencyRates.mockReturnValue({});
    mockSelectTokenMarketData.mockReturnValue({});
    mockSelectNetworkConfigurations.mockReturnValue({});
    mockSelectMultichainAssetsRates.mockReturnValue({});
  });

  it('returns correct context with smart transactions enabled and tokens', () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockSelectSourceToken.mockReturnValue({ symbol: 'ETH' });
    mockSelectDestToken.mockReturnValue({ symbol: 'USDC' });

    const { result } = renderHookWithProvider(
      () => useUnifiedSwapBridgeContext(),
      {
        state: initialRootState,
      },
    );

    expect(result.current).toEqual({
      stx_enabled: true,
      token_symbol_source: 'ETH',
      token_symbol_destination: 'USDC',
      security_warnings: [],
      warnings: [],
      usd_amount_source: 0,
    });
  });

  it('returns empty token symbols when tokens are undefined', () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(false);
    mockSelectSourceToken.mockReturnValue(undefined);
    mockSelectDestToken.mockReturnValue(undefined);

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken: undefined,
        destToken: undefined,
      },
    });

    const { result } = renderHookWithProvider(
      () => useUnifiedSwapBridgeContext(),
      {
        state: testState,
      },
    );

    expect(result.current).toEqual({
      stx_enabled: false,
      token_symbol_source: '',
      token_symbol_destination: '',
      security_warnings: [],
      warnings: [],
      usd_amount_source: 0,
    });
  });

  it('memoizes the result when dependencies do not change', () => {
    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockSelectSourceToken.mockReturnValue({ symbol: 'ETH' });
    mockSelectDestToken.mockReturnValue({ symbol: 'USDC' });

    const { result, rerender } = renderHookWithProvider(
      () => useUnifiedSwapBridgeContext(),
      {
        state: initialRootState,
      },
    );

    const firstResult = result.current;
    rerender({ state: initialRootState });
    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it('calculates usd_amount_source when currency rates and token data are available', () => {
    const mockToken = {
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
    };

    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockSelectSourceToken.mockReturnValue(mockToken);
    mockSelectDestToken.mockReturnValue({ symbol: 'USDC' });
    mockSelectSourceAmount.mockReturnValue('1');
    mockSelectCurrencyRates.mockReturnValue({
      usd: { conversionRate: 1 },
      ETH: { conversionRate: 1 },
    });
    mockSelectTokenMarketData.mockReturnValue({
      '0x1': {
        '0x0000000000000000000000000000000000000000': { price: 2000 },
      },
    });
    mockSelectNetworkConfigurations.mockReturnValue({
      '0x1': { nativeCurrency: 'ETH' },
    });

    const { result } = renderHookWithProvider(
      () => useUnifiedSwapBridgeContext(),
      {
        state: initialRootState,
      },
    );

    expect(result.current.usd_amount_source).toBeDefined();
    expect(result.current.usd_amount_source).toBe(2000);
  });

  it('returns 0 usd_amount_source when usd conversion rate is missing', () => {
    const mockToken = {
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
    };

    mockSelectShouldUseSmartTransaction.mockReturnValue(true);
    mockSelectSourceToken.mockReturnValue(mockToken);
    mockSelectDestToken.mockReturnValue({ symbol: 'USDC' });
    mockSelectSourceAmount.mockReturnValue('1');
    mockSelectCurrencyRates.mockReturnValue({});

    const { result } = renderHookWithProvider(
      () => useUnifiedSwapBridgeContext(),
      {
        state: initialRootState,
      },
    );

    expect(result.current.usd_amount_source).toBe(0);
  });
});
