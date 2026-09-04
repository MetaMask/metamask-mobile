import { act, renderHook } from '@testing-library/react-native';
import {
  PERPS_ERROR_CODES,
  type OrderResult,
  type Position,
} from '@metamask/perps-controller';
import Logger from '../../../../util/Logger';
import {
  POST_ORDER_TPSL_RETRY_OFFSETS_MS,
  usePerpsPostOrderTPSL,
} from './usePerpsPostOrderTPSL';

const mockUpdatePositionTPSL = jest.fn();
const mockShowToast = jest.fn();
const mockPostOrderAttachmentFailed = { id: 'post-order-attachment-failed' };
const mockGetPositionsSnapshot = jest.fn<Position[] | null, []>();
type PositionsCallback = (positions: Position[] | null) => void;
const mockPositionSubscribers = new Set<PositionsCallback>();
const mockStoreSubscribers = new Set<() => void>();
const mockSelectedAccountAddress = jest.fn(() => '0xabc');
const mockSelectedPerpsNetwork = jest.fn(() => 'testnet');
const mockSelectedPerpsProvider = jest.fn(() => 'hyperliquid');
const mockSubscribeToPositions = jest.fn(
  ({ callback }: { callback: PositionsCallback }) => {
    mockPositionSubscribers.add(callback);
    const snapshot = mockGetPositionsSnapshot();
    if (snapshot !== null) {
      callback(snapshot);
    }
    return () => mockPositionSubscribers.delete(callback);
  },
);

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    updatePositionTPSL: mockUpdatePositionTPSL,
  }),
}));

jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      positionManagement: {
        tpsl: {
          postOrderAttachmentFailed: mockPostOrderAttachmentFailed,
        },
      },
    },
  }),
}));

jest.mock('../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => ({
    positions: {
      getSnapshot: mockGetPositionsSnapshot,
      subscribe: mockSubscribeToPositions,
    },
  }),
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: () => ({}),
    subscribe: (callback: () => void) => {
      mockStoreSubscribers.add(callback);
      return () => mockStoreSubscribers.delete(callback);
    },
  },
}));

jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: () => mockSelectedAccountAddress(),
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: () => mockSelectedPerpsNetwork(),
  selectPerpsProvider: () => mockSelectedPerpsProvider(),
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

describe('usePerpsPostOrderTPSL', () => {
  const position = {
    symbol: 'ETH',
    size: '0.1',
  } as Position;
  const flippedPosition = {
    ...position,
    size: '-0.2',
  };
  const order = {
    symbol: 'ETH',
    takeProfitPrice: '3500',
    stopLossPrice: '2500',
  };
  const positionNotFoundResult: OrderResult = {
    success: false,
    error: PERPS_ERROR_CODES.POSITION_NOT_FOUND,
  };

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const deliverPositions = (positions: Position[]) => {
    mockGetPositionsSnapshot.mockReturnValue(positions);
    mockPositionSubscribers.forEach((callback) => callback(positions));
  };

  const notifyStoreChanged = () => {
    mockStoreSubscribers.forEach((callback) => callback());
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPositionSubscribers.clear();
    mockStoreSubscribers.clear();
    mockGetPositionsSnapshot.mockReturnValue([]);
    mockSelectedAccountAddress.mockReturnValue('0xabc');
    mockSelectedPerpsNetwork.mockReturnValue('testnet');
    mockSelectedPerpsProvider.mockReturnValue('hyperliquid');
    mockSubscribeToPositions.mockImplementation(
      ({ callback }: { callback: PositionsCallback }) => {
        mockPositionSubscribers.add(callback);
        const snapshot = mockGetPositionsSnapshot();
        if (snapshot !== null) {
          callback(snapshot);
        }
        return () => mockPositionSubscribers.delete(callback);
      },
    );
    mockUpdatePositionTPSL.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('attaches protection immediately for a new position', async () => {
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachmentResult: OrderResult | undefined;

    await act(async () => {
      attachmentResult = await result.current.attachPostOrderTPSL(order);
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      ...order,
      position: undefined,
    });
    expect(attachmentResult).toEqual({ success: true });
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(result.current.isAttachingPostOrderTPSL).toBe(false);
  });

  it('retries as soon as the position stream renders', async () => {
    mockUpdatePositionTPSL
      .mockResolvedValueOnce(positionNotFoundResult)
      .mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);

    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(1);

    await act(async () => {
      deliverPositions([position]);
      await attachment;
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(2);
    expect(mockUpdatePositionTPSL).toHaveBeenLastCalledWith({
      ...order,
      position,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('finds controller HTTP readiness on the two-second retry', async () => {
    mockUpdatePositionTPSL
      .mockResolvedValueOnce(positionNotFoundResult)
      .mockResolvedValueOnce(positionNotFoundResult)
      .mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);
    await act(async () => {
      jest.advanceTimersByTime(500);
      await flushPromises();
    });
    await act(async () => {
      jest.advanceTimersByTime(1500);
      await attachment;
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(3);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('warns once after position-not-found retries are exhausted', async () => {
    mockUpdatePositionTPSL.mockResolvedValue(positionNotFoundResult);
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);
    for (
      let index = 1;
      index < POST_ORDER_TPSL_RETRY_OFFSETS_MS.length;
      index += 1
    ) {
      const elapsed =
        POST_ORDER_TPSL_RETRY_OFFSETS_MS[index] -
        POST_ORDER_TPSL_RETRY_OFFSETS_MS[index - 1];
      await act(async () => {
        jest.advanceTimersByTime(elapsed);
        await flushPromises();
      });
    }
    let attachmentResult: OrderResult | undefined;
    await act(async () => {
      attachmentResult = await attachment;
    });

    expect(attachmentResult).toEqual(positionNotFoundResult);
    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(4);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(mockPostOrderAttachmentFailed);
    expect(mockPositionSubscribers.size).toBe(0);
    expect(mockStoreSubscribers.size).toBe(0);
  });

  it('fails immediately for a terminal controller result', async () => {
    const terminalResult = {
      success: false,
      error: PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
    };
    mockUpdatePositionTPSL.mockResolvedValue(terminalResult);
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachmentResult: OrderResult | undefined;

    await act(async () => {
      attachmentResult = await result.current.attachPostOrderTPSL(order);
    });

    expect(attachmentResult).toEqual(terminalResult);
    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(mockPostOrderAttachmentFailed);
  });

  it('retries a rejected typed position-not-found error', async () => {
    mockUpdatePositionTPSL
      .mockRejectedValueOnce(new Error(PERPS_ERROR_CODES.POSITION_NOT_FOUND))
      .mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);
    await act(async () => {
      jest.advanceTimersByTime(500);
      await attachment;
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(2);
    expect(Logger.error).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('normalizes a rejected terminal error as an unprotected position', async () => {
    mockUpdatePositionTPSL.mockRejectedValue(new Error('Network unavailable'));
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachmentResult: OrderResult | undefined;

    await act(async () => {
      attachmentResult = await result.current.attachPostOrderTPSL(order);
    });

    expect(attachmentResult).toEqual({
      success: false,
      error: 'Network unavailable',
    });
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Network unavailable' }),
      'usePerpsPostOrderTPSL: Failed to attach protection',
    );
    expect(mockShowToast).toHaveBeenCalledWith(mockPostOrderAttachmentFailed);
  });

  it('aborts without a warning when the trading context changes', async () => {
    mockUpdatePositionTPSL.mockResolvedValue(positionNotFoundResult);
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);
    mockSelectedAccountAddress.mockReturnValue('0xdef');
    let attachmentResult: OrderResult | undefined;
    await act(async () => {
      notifyStoreChanged();
      attachmentResult = await attachment;
    });

    expect(attachmentResult).toBeUndefined();
    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockPositionSubscribers.size).toBe(0);
    expect(mockStoreSubscribers.size).toBe(0);
  });

  it('uses timer retries when the stream subscription fails', async () => {
    mockSubscribeToPositions.mockImplementationOnce(() => {
      throw new Error('Position subscription failed');
    });
    mockUpdatePositionTPSL
      .mockResolvedValueOnce(positionNotFoundResult)
      .mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order);
    });
    await act(flushPromises);
    await act(async () => {
      jest.advanceTimersByTime(500);
      await attachment;
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(2);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('returns the active attachment for a duplicate call', async () => {
    let resolveUpdate: ((result: OrderResult) => void) | undefined;
    mockUpdatePositionTPSL.mockReturnValue(
      new Promise<OrderResult>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let firstAttachment!: Promise<OrderResult | undefined>;
    let secondAttachment!: Promise<OrderResult | undefined>;

    act(() => {
      firstAttachment = result.current.attachPostOrderTPSL(order);
      secondAttachment = result.current.attachPostOrderTPSL(order);
    });

    expect(firstAttachment).toBe(secondAttachment);
    expect(mockUpdatePositionTPSL).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate?.({ success: true });
      await firstAttachment;
    });
  });

  it('waits for a flipped position before attaching protection', async () => {
    mockGetPositionsSnapshot.mockReturnValue([position]);
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order, {
        positionBaseline: position,
      });
    });
    await act(flushPromises);

    expect(mockUpdatePositionTPSL).not.toHaveBeenCalled();

    await act(async () => {
      deliverPositions([flippedPosition]);
      await attachment;
    });

    expect(mockUpdatePositionTPSL).toHaveBeenCalledWith({
      ...order,
      position: flippedPosition,
    });
  });

  it('fails closed when a flipped position never renders', async () => {
    mockGetPositionsSnapshot.mockReturnValue([position]);
    const { result } = renderHook(() => usePerpsPostOrderTPSL());
    let attachment: Promise<OrderResult | undefined>;

    act(() => {
      attachment = result.current.attachPostOrderTPSL(order, {
        positionBaseline: position,
      });
    });
    await act(flushPromises);
    let attachmentResult: OrderResult | undefined;
    await act(async () => {
      jest.advanceTimersByTime(POST_ORDER_TPSL_RETRY_OFFSETS_MS.at(-1) ?? 0);
      attachmentResult = await attachment;
    });

    expect(attachmentResult).toEqual(positionNotFoundResult);
    expect(mockUpdatePositionTPSL).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });
});
