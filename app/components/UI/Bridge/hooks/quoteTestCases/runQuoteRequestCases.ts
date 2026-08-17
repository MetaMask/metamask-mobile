import { BigNumber } from 'ethers';
import { act } from '@testing-library/react-native';

import { isSolanaChainId } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';

import '../../_mocks_/initialState';
import { createBridgeTestState } from '../../testUtils';
import Engine from '../../../../../core/Engine';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useLatestBalance } from '../useLatestBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { endTrace, trace, TraceName } from '../../../../../util/trace';









jest.useFakeTimers();
let spyUpdateBridgeQuoteRequestParams: jest.SpyInstance;

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

const mockUseInsufficientNativeReserveError =
  useInsufficientNativeReserveError as jest.MockedFunction<
    typeof useInsufficientNativeReserveError
  >;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

export const runQuoteRequestCases = ({
  render,
  debounceMs,
  expectedQuoteContext,
}: {
  implementation: 'legacy' | 'copied';
  render: (
    state?: ReturnType<typeof createBridgeTestState>,
    options?: { latestSourceAtomicBalance?: import('ethers').BigNumber },
  ) => {
    result: {
      current: ((opts?: { isRefresh?: boolean }) => Promise<void> | void) & {
        flush?: () => Promise<void> | void;
        cancel?: () => void;
      };
    };
  };
  debounceMs: number;
  expectedQuoteContext: unknown;
}) => {
  describe('quote request cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    spyUpdateBridgeQuoteRequestParams = jest.spyOn(
      Engine.context.BridgeController,
      'updateBridgeQuoteRequestParams',
    );

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
    mockUseInsufficientNativeReserveError.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a debounced function for quote requests', () => {
    const testState = createBridgeTestState();

    const { result } = render(testState);

    expect(typeof result.current).toBe('function');
  });

  it('updates quote parameters with valid input', async () => {
    const testState = createBridgeTestState();

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });
    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalled();
  });

  it('starts the quote trace after the debounce delay', async () => {
    const testState = createBridgeTestState();

    const { result } = render(testState);

    act(() => {
      result.current();
      jest.advanceTimersByTime(debounceMs - 1);
    });

    expect(mockTrace).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      data: { isRefresh: false },
      startTime: expect.any(Number),
    });
  });

  it('marks manually requested quote refreshes in the quote trace', async () => {
    const testState = createBridgeTestState();

    const { result } = render(testState);

    await act(async () => {
      result.current({ isRefresh: true });
      jest.advanceTimersByTime(debounceMs);
    });

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      data: { isRefresh: true },
      startTime: expect.any(Number),
    });
  });

  it('ends the trace when updating quote parameters fails', async () => {
    const error = new Error('quote request failed');
    spyUpdateBridgeQuoteRequestParams.mockRejectedValueOnce(error);

    const testState = createBridgeTestState();

    const { result } = render(testState);

    await expect(
      act(async () => {
        result.current();
        await result.current.flush?.();
      }),
    ).rejects.toThrow(error);

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      timestamp: expect.any(Number),
      data: { success: false },
    });
  });

  it('includes the custom slippage in quote parameters', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        slippage: '3.5',
        isSlippageUserOverride: true,
      },
    });
    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        slippage: 3.5,
      }),
      expectedQuoteContext,
      0,
      1,
    );
  });

  it('omits slippage from quote parameters for Auto', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        slippage: undefined,
        isSlippageUserOverride: true,
      },
    });
    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        slippage: undefined,
      }),
      expectedQuoteContext,
      0,
      1,
    );
  });

  it('skips update when source token is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken: undefined,
      },
    });

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    mockTrace.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
    expect(mockTrace).not.toHaveBeenCalled();
  });

  it('skips update when destination token is missing', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        destToken: undefined,
      },
    });

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
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

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    spyUpdateBridgeQuoteRequestParams.mockClear();
    expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
  });

  it('skips update when destination chain ID is missing', async () => {
    const baseState = createBridgeTestState();
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        selectedDestChainId: undefined,
        destToken: baseState.bridge.destToken
          ? { ...baseState.bridge.destToken, chainId: undefined as never }
          : undefined,
      },
    });

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
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

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '1500000000000000000', // 1.5 ETH in wei
      }),
      expectedQuoteContext,
      0,
      1,
    );
  });

  it('handles decimal point input as zero amount', async () => {
    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: '.',
      },
    });

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '0',
      }),
      expectedQuoteContext,
      0,
      1,
    );
    expect(mockTrace).not.toHaveBeenCalled();
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

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        srcTokenAmount: '1000500000', // 1000.5 with 6 decimals
      }),
      expectedQuoteContext,
      0,
      1,
    );
  });

  it('coalesces multiple rapid calls into a single update', async () => {
    const testState = createBridgeTestState();
    const { result } = render(testState);

    await act(async () => {
      // Make multiple rapid calls
      result.current();
      result.current();
      result.current();

      // Advance timer by less than debounce time
      jest.advanceTimersByTime(debounceMs - 100);

      // Should not have been called yet
      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();

      // Advance timer past debounce time
      jest.advanceTimersByTime(debounceMs + 100);

      // Should have been called exactly once
      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledTimes(1);
    });
  });

  it('uses destAddress as destWalletAddress when destination chain is Solana', async () => {
    const solanaDestChainId = SolScope.Mainnet;
    const evmSourceChainId = '0x1';
    const destSolanaAddress = 'FakeS0LanaAddr3ss111111111111111111111111111';

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
          address: '11111111111111111111111111111111',
          symbol: 'SOL',
          decimals: 9,
          chainId: solanaDestChainId,
          name: 'Solana',
        },
      },
    });

    const { result } = render(testState);

    await act(async () => {
      await result.current();
      jest.advanceTimersByTime(debounceMs);
    });

    expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
      expect.objectContaining({
        destWalletAddress: destSolanaAddress,
      }),
      expectedQuoteContext,
      0,
      1,
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

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded: true,
        }),
        expectedQuoteContext,
        0,
        1,
      );
    });

    it('includes gasIncluded false in quote request when STX send bundle is not supported', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          isGasIncludedSTXSendBundleSupported: false,
        },
      });

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded: false,
        }),
        expectedQuoteContext,
        0,
        1,
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

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded7702: true,
        }),
        expectedQuoteContext,
        0,
        1,
      );
    });

    it('includes gasIncluded7702 false in quote request when 7702 is not supported', async () => {
      const testState = createBridgeTestState();

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded7702: false,
        }),
        expectedQuoteContext,
        0,
        1,
      );
    });
  });

  describe('hardware wallet accounts', () => {
    it('sends gasIncluded and gasIncluded7702 false when useIsGasIncluded7702Supported dispatches false for hardware wallet', async () => {
      // useIsGasIncluded7702Supported now incorporates the HW wallet check and
      // dispatches isGasIncluded7702Supported=false for hardware wallets.
      // useIsGasIncludedSTXSendBundleSupported already dispatches false for HW
      // wallets via selectShouldUseSmartTransaction.
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          isGasIncludedSTXSendBundleSupported: false,
          isGasIncluded7702Supported: false,
          sourceToken: {
            address: '0xSourceToken',
            chainId: '0x1',
            decimals: 18,
            symbol: 'SRC',
          },
          destToken: {
            address: '0xDestToken',
            chainId: '0x1',
            decimals: 18,
            symbol: 'DEST',
          },
        },
      });

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          gasIncluded: false,
          gasIncluded7702: false,
        }),
        expectedQuoteContext,
        0,
        1,
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

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          insufficientBal: false,
        }),
        expectedQuoteContext,
        0,
        1,
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

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          insufficientBal: true,
        }),
        expectedQuoteContext,
        0,
        1,
      );
    });

    it('includes insufficientBal true when balance is sufficient but insufficientNativeReserveError is set', async () => {
      mockUseIsInsufficientBalance.mockReturnValue(false);
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '1.0',
        },
      });

      mockUseInsufficientNativeReserveError.mockReturnValue({
        minimumNativeBalanceToBeKeptInAccount: '10',
        maxSwappableNativeBalance: '40',
      });

      const { result } = render(testState);

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          insufficientBal: true,
        }),
        expectedQuoteContext,
        0,
        1,
      );
    });

    it('passes correct parameters to useIsInsufficientBalance hook', async () => {
      mockUseIsInsufficientBalance.mockReturnValue(false);
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '5.5',
        },
      });

      render(testState);

      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: testState.bridge.sourceToken,
        latestAtomicBalance: BigNumber.from('10000000000000000000'),
        ignoreGasFees: true,
      });
    });

    it('passes correct token parameters to useLatestBalance hook', async () => {
      const testState = createBridgeTestState();

      render(testState);

      expect(mockUseLatestBalance).toHaveBeenCalledWith({
        address: testState.bridge.sourceToken?.address,
        decimals: testState.bridge.sourceToken?.decimals,
        chainId: testState.bridge.sourceToken?.chainId,
        balance: testState.bridge.sourceToken?.balance,
      });
    });

    it('uses latestSourceAtomicBalance override when provided', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '5.5',
        },
      });
      const overriddenAtomicBalance = BigNumber.from('1234500000000000000');

      render(testState, { latestSourceAtomicBalance: overriddenAtomicBalance });

      expect(mockUseLatestBalance).toHaveBeenCalledWith({});
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: testState.bridge.sourceToken,
        latestAtomicBalance: overriddenAtomicBalance,
        ignoreGasFees: true,
      });
    });

    it('uses override path when latestSourceAtomicBalance key is provided as undefined', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '5.5',
        },
      });

      render(testState, { latestSourceAtomicBalance: undefined });

      expect(mockUseLatestBalance).toHaveBeenCalledWith({});
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: testState.bridge.sourceToken,
        latestAtomicBalance: undefined,
        ignoreGasFees: true,
      });
    });

    it('falls back to useLatestBalance when no latestSourceAtomicBalance override is provided', async () => {
      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceAmount: '5.5',
        },
      });
      const latestBalance = BigNumber.from('9000000000000000000');

      mockUseLatestBalance.mockReturnValue({
        displayBalance: '9',
        atomicBalance: latestBalance,
      });

      render(testState);

      expect(mockUseLatestBalance).toHaveBeenCalledWith({
        address: testState.bridge.sourceToken?.address,
        decimals: testState.bridge.sourceToken?.decimals,
        chainId: testState.bridge.sourceToken?.chainId,
        balance: testState.bridge.sourceToken?.balance,
      });
      expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
        amount: '5.5',
        token: testState.bridge.sourceToken,
        latestAtomicBalance: latestBalance,
        ignoreGasFees: true,
      });
    });
  });
  });
};
