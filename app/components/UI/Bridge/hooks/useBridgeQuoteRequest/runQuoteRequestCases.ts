import { BigNumber } from 'ethers';
import { act } from '@testing-library/react-native';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';

import Engine from '../../../../../core/Engine';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import type { BridgeState } from '../../../../../core/redux/slices/bridge';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeSelectors from '../../../../../selectors/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useLatestBalance } from '../useLatestBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';

const spyUpdateBridgeQuoteRequestParams = jest.spyOn(
  Engine.context.BridgeController,
  'updateBridgeQuoteRequestParams',
);

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

const defaultWalletAddress = '0x1234567890123456789012345678901234567890';

const gasParamsFromBridgeState = (bridge: BridgeState) => {
  if (
    bridge.sourceToken?.chainId &&
    isSolanaChainId(bridge.sourceToken.chainId)
  ) {
    return { gasIncluded: true, gasIncluded7702: false };
  }

  if (bridge.isGasIncludedSTXSendBundleSupported) {
    return { gasIncluded: true, gasIncluded7702: false };
  }

  const isSwap = bridge.sourceToken?.chainId === bridge.destToken?.chainId;
  if (isSwap && bridge.isGasIncluded7702Supported) {
    return { gasIncluded: true, gasIncluded7702: true };
  }

  return { gasIncluded: false, gasIncluded7702: false };
};

export const mockContext = {
  feature_id: 'unified_swap_bridge',
  security_warnings: [],
  stx_enabled: false,
  token_security_type_destination: null,
  token_symbol_destination: 'USDC',
  token_symbol_source: 'ETH',
  usd_amount_source: 0,
  warnings: [],
};

export const runQuoteRequestCases = ({
  debounceMs,
  renderHook,
  name,
}: {
  debounceMs: number;
  renderHook: (options?: { latestSourceAtomicBalance?: BigNumber }) => {
    result: {
      current: ((opts?: { isRefresh?: boolean }) => Promise<void> | void) & {
        flush?: () => Promise<void> | void;
        cancel?: () => void;
      };
    };
  };
  name: string;
}) => {
  const renderUseBridgeQuoteRequest = (
    overrides: Partial<BridgeState> = {},
    options?: { latestSourceAtomicBalance?: BigNumber },
  ) => {
    const bridge = { ...mockBridgeReducerState, ...overrides };

    jest
      .spyOn(bridgeSlice, 'selectSourceAmount')
      .mockReturnValue(bridge.sourceAmount);
    jest
      .spyOn(bridgeSlice, 'selectSourceToken')
      .mockReturnValue(bridge.sourceToken);
    jest
      .spyOn(bridgeSlice, 'selectDestToken')
      .mockReturnValue(bridge.destToken);
    jest
      .spyOn(bridgeSlice, 'selectSelectedDestChainId')
      .mockReturnValue(bridge.selectedDestChainId);
    jest.spyOn(bridgeSlice, 'selectSlippage').mockReturnValue(bridge.slippage);
    jest
      .spyOn(bridgeSlice, 'selectDestAddress')
      .mockReturnValue(bridge.destAddress);
    jest
      .spyOn(bridgeSelectors, 'selectSourceWalletAddress')
      .mockReturnValue(defaultWalletAddress);
    jest
      .spyOn(bridgeSelectors, 'selectGasIncludedQuoteParams')
      .mockReturnValue(gasParamsFromBridgeState(bridge));

    return {
      ...renderHook(options),
      bridge,
    };
  };

  return describe(name, () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.useFakeTimers();

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
      const { result } = renderUseBridgeQuoteRequest();

      expect(typeof result.current).toBe('function');
    });

    it('updates quote parameters with valid input', async () => {
      const { result } = renderUseBridgeQuoteRequest();

      act(() => {
        result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalled();
    });

    it('starts the quote trace before the debounce delay', async () => {
      const { result } = renderUseBridgeQuoteRequest();

      act(() => {
        result.current();
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.SwapQuoteFetch,
        op: TraceOperation.BridgeDataFetch,
        data: expect.objectContaining({
          isRefresh: false,
          request_id: expect.any(String),
        }),
        id: expect.any(String),
        startTime: expect.any(Number),
      });

      await act(async () => {
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalled();
    });

    it('marks manually requested quote refreshes in the quote trace', async () => {
      const { result } = renderUseBridgeQuoteRequest();

      act(() => {
        result.current({ isRefresh: true });
        jest.advanceTimersByTime(debounceMs);
      });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.SwapQuoteFetch,
        op: TraceOperation.BridgeDataFetch,
        data: expect.objectContaining({
          isRefresh: true,
          request_id: expect.any(String),
        }),
        id: expect.any(String),
        startTime: expect.any(Number),
      });
    });

    it('ends the trace when updating quote parameters fails', async () => {
      const error = new Error('quote request failed');
      spyUpdateBridgeQuoteRequestParams.mockRejectedValueOnce(error);

      const { result } = renderUseBridgeQuoteRequest();

      await expect(
        act(async () => {
          result.current();
          await result.current.flush?.();
        }),
      ).rejects.toThrow(error);

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.SwapQuoteFetch,
        id: expect.any(String),
        timestamp: expect.any(Number),
        data: { result: 'error' },
      });
    });

    it('includes the custom slippage in quote parameters', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        slippage: '3.5',
        isSlippageUserOverride: true,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: 3.5,
        }),
        mockContext,
        0,
        1,
      );
    });

    it('omits slippage from quote parameters for Auto', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        slippage: undefined,
        isSlippageUserOverride: true,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          slippage: undefined,
        }),
        mockContext,
        0,
        1,
      );
    });

    it('skips update when source token is missing', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceToken: undefined,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('skips update when destination token is missing', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        destToken: undefined,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
    });

    it('skips update when source amount is missing', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceAmount: undefined,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
    });

    it('skips update when destination chain ID is missing', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceToken: undefined,
        selectedDestChainId: undefined,
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).not.toHaveBeenCalled();
    });

    it('converts source amount to wei with 18 decimals', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceAmount: '1.5',
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1500000000000000000', // 1.5 ETH in wei
        }),
        mockContext,
        0,
        1,
      );
    });

    it('converts "." source amount to srcTokenAmount "0"', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceAmount: '.',
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '0',
        }),
        mockContext,
        0,
        1,
      );
      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('converts source amount with custom token decimals', async () => {
      const { result } = renderUseBridgeQuoteRequest({
        sourceAmount: '1000.5',
        sourceToken: {
          ...mockBridgeReducerState.sourceToken,
          decimals: 6,
          address:
            mockBridgeReducerState.sourceToken?.address ||
            '0x0000000000000000000000000000000000000000',
          symbol: mockBridgeReducerState.sourceToken?.symbol || 'TEST',
          name: mockBridgeReducerState.sourceToken?.name || 'Test Token',
          chainId: mockBridgeReducerState.sourceToken?.chainId || '0x1',
        },
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          srcTokenAmount: '1000500000', // 1000.5 with 6 decimals
        }),
        mockContext,
        0,
        1,
      );
    });

    it('coalesces multiple rapid calls into a single update', async () => {
      const { result } = renderUseBridgeQuoteRequest();

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
      const destSolanaAddress = 'FakeS0LanaAddr3ss111111111111111111111111111';

      const { result } = renderUseBridgeQuoteRequest({
        selectedDestChainId: MultichainNetwork.Solana,
        destAddress: destSolanaAddress,
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          chainId: '0x1',
          name: 'Ethereum',
        },
        destToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'SOL',
          decimals: 9,
          chainId: MultichainNetwork.Solana,
          name: 'Solana',
        },
      });

      await act(async () => {
        await result.current();
        jest.advanceTimersByTime(debounceMs);
      });

      expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
        expect.objectContaining({
          destWalletAddress: destSolanaAddress,
        }),
        mockContext,
        0,
        1,
      );
    });

    describe('gasIncluded parameter', () => {
      it('includes gasIncluded true in quote request when STX send bundle is supported', async () => {
        const { result } = renderUseBridgeQuoteRequest({
          isGasIncludedSTXSendBundleSupported: true,
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            gasIncluded: true,
          }),
          mockContext,
          0,
          1,
        );
      });

      it('includes gasIncluded false in quote request when STX send bundle is not supported', async () => {
        const { result } = renderUseBridgeQuoteRequest({
          isGasIncludedSTXSendBundleSupported: false,
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            gasIncluded: false,
          }),
          mockContext,
          0,
          1,
        );
      });

      it('includes gasIncluded7702 true in quote request when 7702 is supported for swap', async () => {
        const { result } = renderUseBridgeQuoteRequest({
          isGasIncluded7702Supported: true,
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
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            gasIncluded7702: true,
          }),
          mockContext,
          0,
          1,
        );
      });

      it('includes gasIncluded7702 false in quote request when 7702 is not supported', async () => {
        const { result } = renderUseBridgeQuoteRequest();

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            gasIncluded7702: false,
          }),
          mockContext,
          0,
          1,
        );
      });
    });

    describe('hardware wallet accounts', () => {
      it('sends gasIncluded and gasIncluded7702 false when useIsGasIncluded7702Supported dispatches false for hardware wallet', async () => {
        const { result } = renderUseBridgeQuoteRequest({
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
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            gasIncluded: false,
            gasIncluded7702: false,
          }),
          mockContext,
          0,
          1,
        );
      });
    });

    describe('insufficientBal parameter', () => {
      it('includes insufficientBal false when balance is sufficient', async () => {
        mockUseIsInsufficientBalance.mockReturnValue(false);

        const { result } = renderUseBridgeQuoteRequest({
          sourceAmount: '1.0',
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            insufficientBal: false,
          }),
          mockContext,
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

        const { result } = renderUseBridgeQuoteRequest({
          sourceAmount: '1000.0', // More than available balance
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            insufficientBal: true,
          }),
          mockContext,
          0,
          1,
        );
      });

      it('includes insufficientBal true when balance is sufficient but insufficientNativeReserveError is set', async () => {
        mockUseIsInsufficientBalance.mockReturnValue(false);
        mockUseInsufficientNativeReserveError.mockReturnValue({
          minimumNativeBalanceToBeKeptInAccount: '10',
          maxSwappableNativeBalance: '40',
        });

        const { result } = renderUseBridgeQuoteRequest({
          sourceAmount: '1.0',
        });

        await act(async () => {
          await result.current();
          jest.advanceTimersByTime(debounceMs);
        });

        expect(spyUpdateBridgeQuoteRequestParams).toHaveBeenCalledWith(
          expect.objectContaining({
            insufficientBal: true,
          }),
          mockContext,
          0,
          1,
        );
      });

      it('passes amount, token, latestAtomicBalance, and ignoreGasFees to useIsInsufficientBalance', () => {
        mockUseIsInsufficientBalance.mockReturnValue(false);

        const { bridge } = renderUseBridgeQuoteRequest({
          sourceAmount: '5.5',
        });

        expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
          amount: '5.5',
          token: bridge.sourceToken,
          latestAtomicBalance: BigNumber.from('10000000000000000000'),
          ignoreGasFees: true,
        });
      });

      it('passes source token address, decimals, chainId, and balance to useLatestBalance', () => {
        const testState = renderUseBridgeQuoteRequest();

        expect(mockUseLatestBalance).toHaveBeenCalledWith({
          address: testState.bridge.sourceToken?.address,
          decimals: testState.bridge.sourceToken?.decimals,
          chainId: testState.bridge.sourceToken?.chainId,
          balance: testState.bridge.sourceToken?.balance,
        });
      });

      it('uses latestSourceAtomicBalance override when provided', () => {
        const overriddenAtomicBalance = BigNumber.from('1234500000000000000');

        const testState = renderUseBridgeQuoteRequest(
          { sourceAmount: '5.5' },
          { latestSourceAtomicBalance: overriddenAtomicBalance },
        );

        expect(mockUseLatestBalance).toHaveBeenCalledWith({});
        expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
          amount: '5.5',
          token: testState.bridge.sourceToken,
          latestAtomicBalance: overriddenAtomicBalance,
          ignoreGasFees: true,
        });
      });

      it.skip('uses override path when latestSourceAtomicBalance key is provided as undefined', () => {
        const testState = renderUseBridgeQuoteRequest(
          { sourceAmount: '5.5' },
          { latestSourceAtomicBalance: undefined },
        );

        expect(mockUseLatestBalance).toHaveBeenCalledWith({});
        expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
          amount: '5.5',
          token: testState.bridge.sourceToken,
          latestAtomicBalance: undefined,
          ignoreGasFees: true,
        });
      });

      it('falls back to useLatestBalance when no latestSourceAtomicBalance override is provided', () => {
        const latestBalance = BigNumber.from('9000000000000000000');
        mockUseLatestBalance.mockReturnValue({
          displayBalance: '9',
          atomicBalance: latestBalance,
        });

        const testState = renderUseBridgeQuoteRequest({
          sourceAmount: '5.5',
        });

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
