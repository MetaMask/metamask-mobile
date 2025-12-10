import '../../_mocks_/initialState';
import { DEBOUNCE_WAIT, useBridgeQuoteRequest } from './';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import Engine from '../../../../../core/Engine';
import { act } from '@testing-library/react-native';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useLatestBalance } from '../useLatestBalance';
import { BigNumber } from 'ethers';

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
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        provider: {
          request: jest.fn(),
          sendAsync: jest.fn(),
        },
        configuration: {
          chainId: '0x1',
        },
      })),
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

// Mock the balance hooks
jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
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

const mockUseIsInsufficientBalance =
  useIsInsufficientBalance as jest.MockedFunction<
    typeof useIsInsufficientBalance
  >;

const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;

describe('useBridgeQuoteRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock wallet address selector to return a valid address
    mockSelectSourceWalletAddress.mockReturnValue(
      '0x1234567890123456789012345678901234567890',
    );

    // Mock balance hooks with default values
    mockUseLatestBalance.mockReturnValue({
      displayBalance: '10',
      atomicBalance: BigNumber.from('10000000000000000000'), // 10 ETH in wei
    });

    mockUseIsInsufficientBalance.mockReturnValue(false);
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

  describe('gasIncluded parameter', () => {
    it('includes gasIncluded true in quote request when STX send bundle is supported', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          isGasIncludedSTXSendBundleSupported: true,
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
          gasIncluded: true,
        }),
        undefined,
      );
    });

    it('includes gasIncluded false in quote request when STX send bundle is not supported', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          isGasIncludedSTXSendBundleSupported: false,
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
          gasIncluded: false,
        }),
        undefined,
      );
    });

    it('includes gasIncluded7702 true in quote request when 7702 is supported for swap', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          isGasIncluded7702Supported: true,
          // Need to set up a swap scenario (same chain) for 7702 to be enabled
          sourceToken: {
            address: '0xSourceToken',
            chainId: '0x1',
            decimals: 18,
            symbol: 'SRC',
          },
          destToken: {
            address: '0xDestToken',
            chainId: '0x1', // Same chain as source for swap
            decimals: 18,
            symbol: 'DEST',
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
          gasIncluded7702: true,
        }),
        undefined,
      );
    });

    it('includes gasIncluded7702 false in quote request when 7702 is not supported', async () => {
      const testState = createBridgeTestState();

      const { result } = renderHookWithProvider(() => useBridgeQuoteRequest(), {
        state: testState,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(DEBOUNCE_WAIT);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded7702: false,
        }),
        undefined,
      );
    });
  });

  describe('insufficientBal parameter', () => {
    it('includes insufficientBal false when balance is sufficient', async () => {
      mockUseIsInsufficientBalance.mockReturnValue(false);
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
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
          insufficientBal: false,
        }),
        undefined,
      );
    });

    it('includes insufficientBal true when balance is insufficient', async () => {
      mockUseIsInsufficientBalance.mockReturnValue(true);
      mockUseLatestBalance.mockReturnValue({
        displayBalance: '0.1',
        atomicBalance: BigNumber.from('100000000000000000'), // 0.1 ETH in wei
      });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '1000.0', // More than available balance
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
          insufficientBal: true,
        }),
        undefined,
      );
    });

    it('passes correct parameters to useIsInsufficientBalance hook', async () => {
      mockUseIsInsufficientBalance.mockReturnValue(false);
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '5.5',
        },
      });

      renderHookWithProvider(() => useBridgeQuoteRequest(), {
        state: testState,
      });

      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: testState.bridge.sourceToken,
        latestAtomicBalance: BigNumber.from('10000000000000000000'),
      });
    });

    it('passes correct token parameters to useLatestBalance hook', async () => {
      const testState = createBridgeTestState();

      renderHookWithProvider(() => useBridgeQuoteRequest(), {
        state: testState,
      });

      expect(mockUseLatestBalance).toHaveBeenCalledWith({
        address: testState.bridge.sourceToken?.address,
        decimals: testState.bridge.sourceToken?.decimals,
        chainId: testState.bridge.sourceToken?.chainId,
      });
    });
  });
});
