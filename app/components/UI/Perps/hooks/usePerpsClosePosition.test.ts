import { act, renderHook } from '@testing-library/react-hooks';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import {
  ORDER_SLIPPAGE_CONFIG,
  PERPS_ERROR_CODES,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import {
  resetPerpsCloseLocksForTests,
  usePerpsCloseInFlight,
  usePerpsClosePosition,
} from './usePerpsClosePosition';
import { usePerpsTrading } from './usePerpsTrading';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';
import { endPerpsCufTrace } from '../utils/perpsCufTrace';
import { PERPS_CUF_TAG, PERPS_CUF_END_REASON } from '../constants/perpsCufTags';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { PERPS_CLOSE_STREAM_CONFIRM_TIMEOUT_MS } from '../constants/perpsConfig';

const mockNavigate = jest.fn();
const mockPositionsSubscribe = jest.fn();
const mockStream = { positions: { subscribe: mockPositionsSubscribe } };

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => mockStream,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: () => unknown) => selector()),
}));
jest.mock('../selectors/perpsController', () => ({
  selectPerpsProvider: jest.fn(() => 'hyperliquid'),
  selectPerpsNetwork: jest.fn(() => 'testnet'),
}));
jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('./usePerpsTrading');
jest.mock('../services/PerpsCacheInvalidator', () => ({
  PerpsCacheInvalidator: { invalidate: jest.fn() },
}));
jest.mock('../utils/perpsCufTrace', () => ({
  ...jest.requireActual('../utils/perpsCufTrace'),
  startPerpsCufTrace: jest.fn(() => 'close-cuf-op'),
  endPerpsCufTrace: jest.fn(),
  endPerpsCufRequestAfter: jest.fn(),
  watchPerpsCufPositionClosed: jest.fn(),
  acceptPerpsCufRequest: jest.fn(),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Create stable mock references for usePerpsToasts
const mockShowToast = jest.fn();
const mockCloseToast = jest.fn();
const mockPerpsToastOptions = {
  positionManagement: {
    closePosition: {
      marketClose: {
        full: {
          closeFullPositionInProgress: jest.fn(),
          closeFullPositionSuccess: jest.fn(),
          closeFullPositionFailed: {},
        },
        partial: {
          closePartialPositionInProgress: jest.fn(),
          closePartialPositionSuccess: jest.fn(),
          closePartialPositionFailed: {},
        },
      },
      limitClose: {
        full: {
          fullPositionCloseSubmitted: jest.fn(),
          fullPositionCloseFailed: {},
        },
        partial: {
          partialPositionCloseSubmitted: jest.fn(),
          partialPositionCloseFailed: {},
        },
      },
      positionAlreadyClosed: { label: 'already-closed' },
      closeAlreadyInProgress: { label: 'close-in-progress' },
    },
  },
};

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    closeToast: mockCloseToast,
    PerpsToastOptions: mockPerpsToastOptions,
  }),
}));

describe('usePerpsClosePosition', () => {
  const mockClosePosition = jest.fn();
  const mockPosition: Position = {
    symbol: 'BTC',
    size: '0.1',
    entryPrice: '50000',
    positionValue: '5000',
    unrealizedPnl: '100',
    marginUsed: '500',
    leverage: { type: 'cross', value: 10 },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '20',
    cumulativeFunding: {
      allTime: '10',
      sinceOpen: '5',
      sinceChange: '2',
    },
    takeProfitCount: 0,
    stopLossCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      closePosition: mockClosePosition,
    });
    jest.mocked(selectPerpsSelectedAccountAddress).mockReturnValue('0xabc');
    resetPerpsCloseLocksForTests();
    // The stream reflects a filled close at once unless a test holds it back.
    mockPositionsSubscribe.mockImplementation(
      ({ callback }: { callback: (positions: Position[]) => void }) => {
        callback([]);
        return jest.fn();
      },
    );
    // Reset toast mocks
    mockShowToast.mockClear();
    mockPerpsToastOptions.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress.mockClear();
    mockPerpsToastOptions.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress.mockClear();
    mockPerpsToastOptions.positionManagement.closePosition.limitClose.full.fullPositionCloseSubmitted.mockClear();
    mockPerpsToastOptions.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted.mockClear();
  });

  describe('handleClosePosition', () => {
    it('should successfully close a position with market order', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '123',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onSuccess }));

      await act(async () => {
        const closeResult = await result.current.handleClosePosition({
          position: mockPosition,
        });
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        symbol: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
        position: mockPosition,
      });

      expect(onSuccess).toHaveBeenCalledWith(successResult);
      expect(result.current.isClosing).toBe(false);
      expect(result.current.error).toBeNull();

      // Verify toasts were shown - progress toast and success toast
      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose.full
          .closeFullPositionInProgress,
      ).toHaveBeenCalledWith('perps.market.long', '0.1', 'BTC');
      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose.full
          .closeFullPositionSuccess,
      ).toHaveBeenCalledWith(mockPosition, undefined);
    });

    it('should successfully close a partial position with limit order', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '456',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onSuccess }));

      await act(async () => {
        const closeResult = await result.current.handleClosePosition({
          position: mockPosition,
          size: '0.05',
          orderType: 'limit',
          limitPrice: '51000',
        });
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        symbol: 'BTC',
        size: '0.05',
        orderType: 'limit',
        price: '51000',
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
        position: mockPosition,
      });

      expect(onSuccess).toHaveBeenCalledWith(successResult);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Closing position',
        {
          symbol: 'BTC',
          size: '0.05',
          orderType: 'limit',
          limitPrice: '51000',
        },
      );
    });

    it('does not forward slippage/staleness params for a partial limit close', async () => {
      // Arrange - limit close should rest at the limit price without the
      // market price-staleness check that throws "Price moved too much"
      mockClosePosition.mockResolvedValue({ success: true, orderId: '456' });

      const { result } = renderHook(() => usePerpsClosePosition());

      // Act
      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          size: '0.05',
          orderType: 'limit',
          limitPrice: '51000',
          slippage: {
            usdAmount: '2500',
            priceAtCalculation: 50000,
            maxSlippageBps: ORDER_SLIPPAGE_CONFIG.DefaultLimitSlippageBps,
          },
        });
      });

      // Assert - slippage params stripped, exact size + limit price sent
      expect(mockClosePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '0.05',
          orderType: 'limit',
          price: '51000',
          usdAmount: undefined,
          priceAtCalculation: undefined,
          maxSlippageBps: undefined,
        }),
      );
    });

    it('forwards slippage/staleness params for a partial market close', async () => {
      // Arrange
      mockClosePosition.mockResolvedValue({ success: true, orderId: '456' });

      const { result } = renderHook(() => usePerpsClosePosition());

      // Act
      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          size: '0.05',
          orderType: 'market',
          slippage: {
            usdAmount: '2500',
            priceAtCalculation: 50000,
            maxSlippageBps: ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps,
          },
        });
      });

      // Assert - market orders keep the slippage/staleness protection
      expect(mockClosePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '0.05',
          orderType: 'market',
          usdAmount: '2500',
          priceAtCalculation: 50000,
          maxSlippageBps: ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps,
        }),
      );
    });

    it('should handle close position failure', async () => {
      const failureResult: OrderResult = {
        success: false,
        error: 'perps.close_position.error_unknown',
      };
      mockClosePosition.mockResolvedValue(failureResult);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('perps.close_position.error_unknown');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'perps.close_position.error_unknown',
        }),
      );
      expect(result.current.isClosing).toBe(false);
      expect(result.current.error).toEqual(
        expect.objectContaining({
          message: 'perps.close_position.error_unknown',
        }),
      );
    });

    it('should handle close position failure with default error message', async () => {
      const failureResult: OrderResult = {
        success: false,
        error: undefined, // No specific error message
      };
      mockClosePosition.mockResolvedValue(failureResult);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('perps.close_position.error_unknown');
      });

      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'perps.close_position.error_unknown',
        }),
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'perps',
            component: 'usePerpsClosePosition',
            action: 'close_position',
          }),
          context: expect.objectContaining({
            name: 'usePerpsClosePosition',
            data: expect.objectContaining({
              symbol: 'BTC',
              orderType: 'market',
              isFullClose: true,
              rawError: undefined,
            }),
          }),
        }),
      );
    });

    it('should handle exceptions thrown by closePosition', async () => {
      const error = new Error('Network error');
      mockClosePosition.mockRejectedValue(error);

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('Network error');
      });

      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.error).toBe(error);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Error closing position',
        error,
      );
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.objectContaining({
            feature: 'perps',
            component: 'usePerpsClosePosition',
            action: 'close_position',
          }),
          context: expect.objectContaining({
            name: 'usePerpsClosePosition',
            data: expect.objectContaining({
              symbol: 'BTC',
              requestedSize: undefined,
              orderType: 'market',
              isFullClose: true,
            }),
          }),
        }),
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockClosePosition.mockRejectedValue('String error');

      const onError = jest.fn();
      const { result } = renderHook(() => usePerpsClosePosition({ onError }));

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('perps.close_position.error_unknown');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'perps.close_position.error_unknown',
        }),
      );
    });

    it('should set isClosing state correctly during operation', async () => {
      let resolvePromise: (value: OrderResult) => void;
      const promise = new Promise<OrderResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockClosePosition.mockReturnValue(promise);

      const { result } = renderHook(() => usePerpsClosePosition());

      // Start closing
      let closePromise: Promise<OrderResult | undefined>;
      act(() => {
        closePromise = result.current.handleClosePosition({
          position: mockPosition,
        });
      });

      // Check loading state
      expect(result.current.isClosing).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise({ success: true, orderId: '789' });
        await closePromise;
      });

      // Check final state
      expect(result.current.isClosing).toBe(false);
    });

    it('should work without options', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '999',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        const closeResult = await result.current.handleClosePosition({
          position: mockPosition,
          size: '0.1',
          orderType: 'market',
        });
        expect(closeResult).toEqual(successResult);
      });

      expect(mockClosePosition).toHaveBeenCalledWith({
        symbol: 'BTC',
        size: '0.1',
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
        position: mockPosition,
      });
    });

    it('should log all operations correctly', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '111',
        filledSize: '0.1',
        averagePrice: '50100',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });

      // Check logging calls
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Closing position',
        {
          symbol: 'BTC',
          size: undefined,
          orderType: 'market',
          limitPrice: undefined,
        },
      );

      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Close result',
        successResult,
      );
    });

    it('should handle position with TP/SL correctly', async () => {
      const positionWithTPSL: Position = {
        ...mockPosition,
        takeProfitPrice: '55000',
        stopLossPrice: '45000',
      };

      const successResult: OrderResult = {
        success: true,
        orderId: '222',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        const closeResult = await result.current.handleClosePosition({
          position: positionWithTPSL,
        });
        expect(closeResult).toEqual(successResult);
      });

      // The hook doesn't need special handling for TP/SL as that's done in the provider
      expect(mockClosePosition).toHaveBeenCalledWith({
        symbol: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
        position: positionWithTPSL,
      });
    });

    it('should reset error state on new close attempt', async () => {
      // First attempt fails
      mockClosePosition.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('First error');
      });

      expect(result.current.error).toEqual(
        expect.objectContaining({ message: 'First error' }),
      );

      // Second attempt succeeds
      mockClosePosition.mockResolvedValueOnce({
        success: true,
        orderId: '333',
      });

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });

      expect(result.current.error).toBeNull();
    });

    describe('toast notifications for market orders', () => {
      describe('progress toasts', () => {
        it('should show progress toast for full position market close', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '123',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'market',
            });
          });

          // Verify progress toast is called with correct parameters
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionInProgress,
          ).toHaveBeenCalledWith('perps.market.long', '0.1', 'BTC');
        });

        it('should show progress toast for partial position market close', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '456',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              size: '0.05',
              orderType: 'market',
            });
          });

          // Verify progress toast is called with correct parameters
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionInProgress,
          ).toHaveBeenCalledWith('perps.market.long', '0.05', 'BTC');
        });

        it('should show progress toast for short position', async () => {
          const shortPosition: Position = {
            ...mockPosition,
            size: '-0.1', // Negative size indicates short position
          };

          const successResult: OrderResult = {
            success: true,
            orderId: '789',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: shortPosition,
              orderType: 'market',
            });
          });

          // Verify progress toast is called with correct direction for short position
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionInProgress,
          ).toHaveBeenCalledWith('perps.market.short', '-0.1', 'BTC');
        });
      });

      describe('success toasts', () => {
        it('should show success toast for full position market close', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '123',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'market',
            });
          });

          // Should show progress toast first, then success toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionSuccess,
          ).toHaveBeenCalledWith(mockPosition, undefined);
        });

        it('should show success toast for partial position market close', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '456',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              size: '0.05',
              orderType: 'market',
            });
          });

          // Should show progress toast first, then success toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionSuccess,
          ).toHaveBeenCalledWith(mockPosition, undefined);
        });

        it('should show success toast when size is empty string (treated as full close)', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '999',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              size: '',
              orderType: 'market',
            });
          });

          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionSuccess,
          ).toHaveBeenCalledWith(mockPosition, undefined);
        });
      });

      describe('failure toasts', () => {
        it('shows already-closed toast when close returns No position found', async () => {
          mockClosePosition.mockResolvedValue({
            success: false,
            error: 'No position found for BTC',
          });
          const onSuccess = jest.fn();
          const { result } = renderHook(() =>
            usePerpsClosePosition({ onSuccess }),
          );

          let closeResult: OrderResult | undefined;
          await act(async () => {
            closeResult = await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'market',
            });
          });

          expect(closeResult).toEqual({
            success: false,
            error: 'No position found for BTC',
          });
          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition
              .positionAlreadyClosed,
          );
          expect(PerpsCacheInvalidator.invalidate).toHaveBeenCalledWith(
            'positions',
          );
          expect(PerpsCacheInvalidator.invalidate).toHaveBeenCalledWith(
            'accountState',
          );
          expect(endPerpsCufTrace).toHaveBeenCalledWith({
            id: 'close-cuf-op',
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.ALREADY_CLOSED,
            },
          });
          expect(onSuccess).not.toHaveBeenCalled();
          expect(Logger.error).not.toHaveBeenCalled();
        });

        it('shows already-closed toast when close throws No position found', async () => {
          mockClosePosition.mockRejectedValue(
            new Error('No position found for BTC'),
          );
          const onSuccess = jest.fn();
          const { result } = renderHook(() =>
            usePerpsClosePosition({ onSuccess }),
          );

          let closeResult: OrderResult | undefined;
          await act(async () => {
            closeResult = await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'market',
            });
          });

          expect(closeResult).toEqual({
            success: false,
            error: 'No position found for BTC',
          });
          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition
              .positionAlreadyClosed,
          );
          expect(PerpsCacheInvalidator.invalidate).toHaveBeenCalledWith(
            'positions',
          );
          expect(PerpsCacheInvalidator.invalidate).toHaveBeenCalledWith(
            'accountState',
          );
          expect(endPerpsCufTrace).toHaveBeenCalledWith({
            id: 'close-cuf-op',
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.ALREADY_CLOSED,
            },
          });
          expect(onSuccess).not.toHaveBeenCalled();
          expect(Logger.error).not.toHaveBeenCalled();
        });

        it('should show failure toast for full position market close', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'close_position_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          // Should show progress toast first, then failure toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionFailed,
          );
        });

        it('dismisses a persistent IOC failure toast before recovery', async () => {
          mockClosePosition.mockResolvedValue({
            success: false,
            error: PERPS_ERROR_CODES.IOC_CANCEL,
            errorCode: PERPS_ERROR_CODES.IOC_CANCEL,
          });
          const onAdjustSlippage = jest.fn();
          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                orderType: 'market',
                onAdjustSlippage,
              }),
            ).rejects.toThrow();
          });

          const failureToast = mockShowToast.mock.calls[1][0];
          expect(failureToast).toMatchObject({
            hasNoTimeout: true,
            linkButtonOptions: {
              label: 'perps.order.adjust_slippage',
            },
          });

          act(() => failureToast.linkButtonOptions.onPress());

          expect(mockCloseToast).toHaveBeenCalledTimes(1);
          expect(onAdjustSlippage).toHaveBeenCalledTimes(1);
          expect(mockCloseToast.mock.invocationCallOrder[0]).toBeLessThan(
            onAdjustSlippage.mock.invocationCallOrder[0],
          );
        });

        it('should show failure toast for partial position market close', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'close_position_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          // Should show progress toast first, then failure toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionFailed,
          );
        });

        it('offers fresh-price review for PRICE_MOVED partial closes', async () => {
          mockClosePosition.mockResolvedValue({
            success: false,
            error: 'Price moved too much',
            errorCode: PERPS_ERROR_CODES.PRICE_MOVED,
            errorDetails: {
              code: PERPS_ERROR_CODES.PRICE_MOVED,
              priceDeltaBps: 336,
              maxSlippageBps: 300,
              expectedPrice: 788.71,
              currentPrice: 815.22,
            },
          });
          const onReviewPrice = jest.fn();
          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'market',
                onReviewPrice,
              }),
            ).rejects.toThrow();
          });

          const failureToast = mockShowToast.mock.calls[1][0];
          expect(failureToast.linkButtonOptions.label).toBe(
            'perps.order.review_updated_price',
          );

          act(() => failureToast.linkButtonOptions.onPress());

          expect(mockCloseToast).toHaveBeenCalledTimes(1);
          expect(onReviewPrice).toHaveBeenCalledTimes(1);
        });

        it('should show failure toast when size is empty string (treated as full close)', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'close_position_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '',
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionFailed,
          );
        });

        it('should show failure toast with undefined error', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: undefined,
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          // Should still show failure toast even with undefined error
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionFailed,
          );
        });
      });

      describe('limit order toasts', () => {
        it('should only show submission toast for full position limit close (no success toast)', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '789',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'limit',
              limitPrice: '51000',
            });
          });

          // Should only show submission toast for limit orders, not success toast
          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .full.fullPositionCloseSubmitted,
          ).toHaveBeenCalledWith('perps.market.long', '0.1', 'BTC');
        });

        it('should only show submission toast for partial position limit close (no success toast)', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '789',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              size: '0.05',
              orderType: 'limit',
              limitPrice: '51000',
            });
          });

          // Should only show submission toast for limit orders, not success toast
          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseSubmitted,
          ).toHaveBeenCalledWith('perps.market.long', '0.05', 'BTC');
        });

        it('should show failure toast for failed partial limit close', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'limit_order_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'limit',
                limitPrice: '51000',
              }),
            ).rejects.toThrow();
          });

          // Submission toast first, then the partial-close failure toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseSubmitted,
          ).toHaveBeenCalledWith('perps.market.long', '0.05', 'BTC');
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseFailed,
          );
        });

        it('should show failure toast for failed full limit close', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'limit_order_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                orderType: 'limit',
                limitPrice: '51000',
              }),
            ).rejects.toThrow();
          });

          // Submission toast first, then the full-close failure toast
          expect(mockShowToast).toHaveBeenCalledTimes(2);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .full.fullPositionCloseSubmitted,
          ).toHaveBeenCalledWith('perps.market.long', '0.1', 'BTC');
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .full.fullPositionCloseFailed,
          );
        });
      });

      describe('failure toasts on a rejected promise (catch path)', () => {
        it('shows the market full-close failure toast when the promise rejects', async () => {
          mockClosePosition.mockRejectedValue(new Error('network error'));

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionFailed,
          );
        });

        it('shows the market partial-close failure toast when the promise rejects', async () => {
          mockClosePosition.mockRejectedValue(new Error('network error'));

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionFailed,
          );
        });

        it('shows the limit full-close failure toast when the promise rejects', async () => {
          mockClosePosition.mockRejectedValue(new Error('network error'));

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                orderType: 'limit',
                limitPrice: '51000',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .full.fullPositionCloseFailed,
          );
        });

        it('shows the limit partial-close failure toast when the promise rejects', async () => {
          mockClosePosition.mockRejectedValue(new Error('network error'));

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'limit',
                limitPrice: '51000',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenCalledWith(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseFailed,
          );
        });

        it('does not double-show the failure toast for a returned failure result', async () => {
          // A { success: false } result shows the failure toast then throws; the
          // catch must not show it a second time. Submission + one failure = 2.
          mockClosePosition.mockResolvedValue({
            success: false,
            error: 'limit_order_failed',
          });

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'limit',
                limitPrice: '51000',
              }),
            ).rejects.toThrow();
          });

          expect(mockShowToast).toHaveBeenCalledTimes(2);
        });
      });

      describe('toast sequence verification', () => {
        it('should show toasts in correct order for successful market close', async () => {
          const successResult: OrderResult = {
            success: true,
            orderId: '123',
          };
          mockClosePosition.mockResolvedValue(successResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await result.current.handleClosePosition({
              position: mockPosition,
              orderType: 'market',
            });
          });

          // Verify exact sequence: progress first, then success
          expect(mockShowToast).toHaveBeenCalledTimes(2);

          // Verify progress toast was called with correct parameters
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionInProgress,
          ).toHaveBeenCalledWith('perps.market.long', '0.1', 'BTC');

          // First showToast call should be the progress toast result
          const progressToastResult =
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionInProgress.mock.results[0]?.value;
          expect(mockShowToast).toHaveBeenNthCalledWith(1, progressToastResult);

          // Second call should be success toast function result
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .full.closeFullPositionSuccess,
          ).toHaveBeenCalledWith(mockPosition, undefined);
        });

        it('should show toasts in correct order for failed market close', async () => {
          const failureResult: OrderResult = {
            success: false,
            error: 'close_failed',
          };
          mockClosePosition.mockResolvedValue(failureResult);

          const { result } = renderHook(() => usePerpsClosePosition());

          await act(async () => {
            await expect(
              result.current.handleClosePosition({
                position: mockPosition,
                size: '0.05',
                orderType: 'market',
              }),
            ).rejects.toThrow();
          });

          // Verify exact sequence: progress first, then failure
          expect(mockShowToast).toHaveBeenCalledTimes(2);

          // Verify progress toast was called with correct parameters
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionInProgress,
          ).toHaveBeenCalledWith('perps.market.long', '0.05', 'BTC');

          // First showToast call should be the progress toast result
          const progressToastResult =
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionInProgress.mock.results[0]?.value;
          expect(mockShowToast).toHaveBeenNthCalledWith(1, progressToastResult);

          // Second call should be failure toast
          expect(mockShowToast).toHaveBeenNthCalledWith(
            2,
            mockPerpsToastOptions.positionManagement.closePosition.marketClose
              .partial.closePartialPositionFailed,
          );
        });
      });
    });
  });

  describe('in-flight close lock', () => {
    it('ignores a close from a remounted hook while the same symbol is closing', async () => {
      let resolveFirst: (value: OrderResult) => void = () => undefined;
      mockClosePosition.mockReturnValueOnce(
        new Promise<OrderResult>((resolve) => {
          resolveFirst = resolve;
        }),
      );
      const first = renderHook(() => usePerpsClosePosition());
      const second = renderHook(() => usePerpsClosePosition());

      let firstClose: Promise<unknown> = Promise.resolve();
      let secondResult: unknown;
      await act(async () => {
        firstClose = first.result.current.handleClosePosition({
          position: mockPosition,
        });
        secondResult = await second.result.current.handleClosePosition({
          position: mockPosition,
        });
      });

      expect(secondResult).toBeUndefined();
      expect(mockClosePosition).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockPerpsToastOptions.positionManagement.closePosition
          .closeAlreadyInProgress,
      );

      await act(async () => {
        resolveFirst({ success: true, orderId: '1' });
        await firstClose;
      });
    });

    it('does not block a close on a different symbol', async () => {
      let resolveFirst: (value: OrderResult) => void = () => undefined;
      mockClosePosition
        .mockReturnValueOnce(
          new Promise<OrderResult>((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce({ success: true, orderId: '2' });
      const { result } = renderHook(() => usePerpsClosePosition());

      let firstClose: Promise<unknown> = Promise.resolve();
      await act(async () => {
        firstClose = result.current.handleClosePosition({
          position: mockPosition,
        });
        await result.current.handleClosePosition({
          position: { ...mockPosition, symbol: 'ETH' },
        });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(2);
      expect(mockClosePosition).toHaveBeenLastCalledWith(
        expect.objectContaining({ symbol: 'ETH' }),
      );

      await act(async () => {
        resolveFirst({ success: true, orderId: '1' });
        await firstClose;
      });
    });

    it('does not block the same symbol after the account changes', async () => {
      let resolveFirst: (value: OrderResult) => void = () => undefined;
      mockClosePosition
        .mockReturnValueOnce(
          new Promise<OrderResult>((resolve) => {
            resolveFirst = resolve;
          }),
        )
        .mockResolvedValueOnce({ success: true, orderId: '2' });
      const first = renderHook(() => usePerpsClosePosition());
      jest.mocked(selectPerpsSelectedAccountAddress).mockReturnValue('0xdef');
      const second = renderHook(() => usePerpsClosePosition());

      let firstClose: Promise<unknown> = Promise.resolve();
      await act(async () => {
        firstClose = first.result.current.handleClosePosition({
          position: mockPosition,
        });
        await second.result.current.handleClosePosition({
          position: mockPosition,
        });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(2);

      await act(async () => {
        resolveFirst({ success: true, orderId: '1' });
        await firstClose;
      });
    });

    it('keeps a filled market close locked until the positions stream updates', async () => {
      let emitPositions: (positions: Position[] | null) => void = () =>
        undefined;
      mockPositionsSubscribe.mockImplementation(
        ({
          callback,
        }: {
          callback: (positions: Position[] | null) => void;
        }) => {
          emitPositions = callback;
          callback([mockPosition]);
          return jest.fn();
        },
      );
      mockClosePosition.mockResolvedValue({ success: true, orderId: '1' });
      const { result } = renderHook(() => usePerpsClosePosition());
      const inFlight = renderHook(() => usePerpsCloseInFlight('BTC'));

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
        await result.current.handleClosePosition({ position: mockPosition });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(1);
      expect(inFlight.result.current).toBe(true);

      act(() => {
        emitPositions(null);
      });

      expect(inFlight.result.current).toBe(true);

      act(() => {
        emitPositions([]);
      });

      expect(inFlight.result.current).toBe(false);
      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });
      expect(mockClosePosition).toHaveBeenCalledTimes(2);

      act(() => {
        emitPositions([]);
      });
    });

    it('releases a filled market close after the stream confirmation timeout', async () => {
      jest.useFakeTimers();
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockClosePosition.mockResolvedValue({ success: true, orderId: '1' });
      const inFlight = renderHook(() => usePerpsCloseInFlight('BTC'));
      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });
      expect(inFlight.result.current).toBe(true);

      act(() => {
        jest.advanceTimersByTime(PERPS_CLOSE_STREAM_CONFIRM_TIMEOUT_MS);
      });

      expect(inFlight.result.current).toBe(false);
      jest.useRealTimers();
    });

    it('releases a limit close as soon as it settles', async () => {
      mockPositionsSubscribe.mockReturnValue(jest.fn());
      mockClosePosition.mockResolvedValue({ success: true, orderId: '1' });
      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          orderType: 'limit',
          limitPrice: '51000',
        });
        await result.current.handleClosePosition({ position: mockPosition });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(2);
    });

    it('releases the lock after a successful close', async () => {
      mockClosePosition.mockResolvedValue({ success: true, orderId: '1' });
      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
        await result.current.handleClosePosition({ position: mockPosition });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(2);
    });

    it('releases the lock after a thrown close so the user can retry', async () => {
      mockClosePosition
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({ success: true, orderId: '1' });
      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await expect(
          result.current.handleClosePosition({ position: mockPosition }),
        ).rejects.toThrow('network down');
      });
      let retryResult: unknown;
      await act(async () => {
        retryResult = await result.current.handleClosePosition({
          position: mockPosition,
        });
      });

      expect(mockClosePosition).toHaveBeenCalledTimes(2);
      expect(retryResult).toEqual({ success: true, orderId: '1' });
    });
  });

  describe('marketPrice parameter handling', () => {
    it('accepts optional marketPrice parameter in handleClosePosition', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '123',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          orderType: 'market',
          marketPrice: '$55000',
        });
      });

      expect(mockClosePosition).toHaveBeenCalled();
    });

    it('passes marketPrice to closeFullPositionSuccess toast for full market close', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '123',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          orderType: 'market',
          marketPrice: '$55000',
        });
      });

      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose.full
          .closeFullPositionSuccess,
      ).toHaveBeenCalledWith(mockPosition, '$55000');
    });

    it('passes marketPrice to closePartialPositionSuccess toast for partial market close', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '456',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          size: '0.05',
          orderType: 'market',
          marketPrice: '$55000',
        });
      });

      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose
          .partial.closePartialPositionSuccess,
      ).toHaveBeenCalledWith(mockPosition, '$55000');
    });

    it('passes position object to success toast functions', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '789',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          orderType: 'market',
          marketPrice: '$50000',
        });
      });

      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose.full
          .closeFullPositionSuccess,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'BTC' }),
        '$50000',
      );
    });

    it('works when marketPrice is undefined', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '999',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({
          position: mockPosition,
          orderType: 'market',
        });
      });

      expect(
        mockPerpsToastOptions.positionManagement.closePosition.marketClose.full
          .closeFullPositionSuccess,
      ).toHaveBeenCalledWith(mockPosition, undefined);
    });
  });

  describe('hook lifecycle', () => {
    it('should maintain state across re-renders', async () => {
      const successResult: OrderResult = {
        success: true,
        orderId: '444',
      };
      mockClosePosition.mockResolvedValue(successResult);

      const { result, rerender } = renderHook(() => usePerpsClosePosition());

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });

      const handleClosePositionBefore = result.current.handleClosePosition;

      // Re-render the hook
      rerender();

      // handleClosePosition should be stable due to useCallback
      expect(result.current.handleClosePosition).toBe(
        handleClosePositionBefore,
      );
    });

    it('should update callbacks when options change', async () => {
      const onSuccess1 = jest.fn();
      const onSuccess2 = jest.fn();

      const { result, rerender } = renderHook(
        ({ onSuccess }) => usePerpsClosePosition({ onSuccess }),
        { initialProps: { onSuccess: onSuccess1 } },
      );

      const handleClosePositionBefore = result.current.handleClosePosition;

      // Change the onSuccess callback
      rerender({ onSuccess: onSuccess2 });

      // handleClosePosition should be a new function
      expect(result.current.handleClosePosition).not.toBe(
        handleClosePositionBefore,
      );

      // Execute with new callback
      mockClosePosition.mockResolvedValue({ success: true, orderId: '555' });

      await act(async () => {
        await result.current.handleClosePosition({ position: mockPosition });
      });

      expect(onSuccess1).not.toHaveBeenCalled();
      expect(onSuccess2).toHaveBeenCalled();
    });
  });
});
