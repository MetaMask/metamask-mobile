import { act, renderHook } from '@testing-library/react-hooks';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { OrderResult, Position } from '../controllers/types';
import { usePerpsClosePosition } from './usePerpsClosePosition';
import { usePerpsTrading } from './usePerpsTrading';

const mockNavigate = jest.fn();

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
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

// Create stable mock references for usePerpsToasts
const mockShowToast = jest.fn();
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
        },
        partial: {
          partialPositionCloseSubmitted: jest.fn(),
        },
      },
    },
  },
};

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: mockPerpsToastOptions,
  }),
}));

describe('usePerpsClosePosition', () => {
  const mockClosePosition = jest.fn();
  const mockPosition: Position = {
    coin: 'BTC',
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
        coin: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
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
        coin: 'BTC',
        size: '0.05',
        orderType: 'limit',
        price: '51000',
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
      });

      expect(onSuccess).toHaveBeenCalledWith(successResult);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePerpsClosePosition: Closing position',
        {
          coin: 'BTC',
          size: '0.05',
          orderType: 'limit',
          limitPrice: '51000',
        },
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
      let closePromise: Promise<OrderResult>;
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
        coin: 'BTC',
        size: '0.1',
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
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
          coin: 'BTC',
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
        coin: 'BTC',
        size: undefined,
        orderType: 'market',
        price: undefined,
        trackingData: undefined,
        usdAmount: undefined,
        priceAtCalculation: undefined,
        maxSlippageBps: undefined,
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

        it('should not show failure toast for failed limit orders', async () => {
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

          // Should only show submission toast, not failure toast for limit orders
          expect(mockShowToast).toHaveBeenCalledTimes(1);
          expect(
            mockPerpsToastOptions.positionManagement.closePosition.limitClose
              .partial.partialPositionCloseSubmitted,
          ).toHaveBeenCalledWith('perps.market.long', '0.05', 'BTC');
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
        expect.objectContaining({ coin: 'BTC' }),
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
