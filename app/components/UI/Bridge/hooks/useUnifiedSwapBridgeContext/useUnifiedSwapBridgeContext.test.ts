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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct context with smart transactions enabled and tokens', () => {
    // Setup mocks
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
    });
  });

  it('returns empty token symbols when tokens are undefined', () => {
    // Setup mocks
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
    });
  });

  it('memoizes the result when dependencies do not change', () => {
    // Setup mocks
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
});
