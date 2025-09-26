import '../../_mocks_/initialState';
import { DEBOUNCE_WAIT, useBridgeQuoteRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import Engine from '../../../../../core/Engine';
import { act } from '@testing-library/react-native';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';

// Mock isSolanaChainId
jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  isSolanaChainId: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x1234567890123456789012345678901234567890'],
            type: 'HD Key Tree',
            metadata: {
              id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
              name: '',
            },
          },
        ],
      },
    },
  },
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(),
}));

// Mock the bridge selector
jest.mock('../../../../../selectors/bridge', () => ({
  selectSourceWalletAddress: jest.fn(),
}));

jest.useFakeTimers();
const spyUpdateBridgeQuoteRequestParams = jest.spyOn(
  Engine.context.BridgeController,
  'updateBridgeQuoteRequestParams',
);

const mockSelectSourceWalletAddress =
  selectSourceWalletAddress as jest.MockedFunction<
    typeof selectSourceWalletAddress
  >;

describe('useBridgeQuoteRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock wallet address selector to return a valid address
    mockSelectSourceWalletAddress.mockReturnValue(
      '0x1234567890123456789012345678901234567890',
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a debounced function for quote requests', () => {
    const testState = createBridgeTestState();

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    expect(typeof result.current).toBe('function');
  });

  it('updates quote parameters with valid input', async () => {
    const testState = createBridgeTestState();

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalled();
  });

  it('skips update when source token is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken: undefined,
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
  });

  it('skips update when destination token is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        destToken: undefined,
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
  });

  it('skips update when source amount is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: undefined,
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
  });

  it('skips update when destination chain ID is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        selectedDestChainId: undefined,
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
  });

  it('converts source amount to wei with 18 decimals', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: '1.5',
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '1500000000000000000', // 1.5 ETH in wei
      }),
      undefined,
    );
  });

  it('handles decimal point input as zero amount', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: '.',
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '0',
      }),
      undefined,
    );
  });

  it('converts source amount with custom token decimals', async () => {
    const baseState = createBridgeTestState();
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: '1000.5',
        sourceToken: {
          ...baseState.bridge.sourceToken,
          decimals: 6,
          address:
            baseState.bridge.sourceToken?.address ||
            '0x0000000000000000000000000000000000000000',
          symbol: baseState.bridge.sourceToken?.symbol || 'TEST',
          name: baseState.bridge.sourceToken?.name || 'Test Token',
          chainId: baseState.bridge.sourceToken?.chainId || '0x1',
        },
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '1000500000', // 1000.5 with 6 decimals
      }),
      undefined,
    );
  });

  it('coalesces multiple rapid calls into a single update', async () => {
    const testState = createBridgeTestState();
    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      // Make multiple rapid calls
      result.current();
      result.current();
      result.current();

      // Advance timer by less than debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);

      // Should not have been called yet
      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();

      // Advance timer past debounce time
      jest.advanceTimersByTime(DEBOUNCE_WAIT + 100);

      // Should have been called exactly once
      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledTimes(1);
    });
  });

  it('uses destAddress as destWalletAddress when destination chain is Solana', async () => {
    const solanaDestChainId = '0xfa'; // Solana chain ID
    const evmSourceChainId = '0x1'; // Ethereum chain ID
    const destSolanaAddress = 'FakeS0LanaAddr3ss111111111111111111111111111';

    // Mock isSolanaChainId to return true for Solana chain ID and false for EVM chain ID
    (isSolanaChainId as jest.Mock).mockImplementation(
      (chainId) => chainId === solanaDestChainId,
    );

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        selectedDestChainId: solanaDestChainId,
        destAddress: destSolanaAddress,
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          chainId: evmSourceChainId,
          name: 'Ethereum',
        },
        destToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'SOL',
          decimals: 9,
          chainId: solanaDestChainId,
          name: 'Solana',
        },
      },
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
      state: testState,
    });

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        destWalletAddress: destSolanaAddress,
      }),
      undefined,
    );

    // Reset mock
    (isSolanaChainId as jest.Mock).mockReset();
  });
});
