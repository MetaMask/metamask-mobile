import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  Position,
  PositionModifyPreviewResult,
} from '@metamask/perps-controller';
import { usePerpsPositionModifyPreview } from './usePerpsPositionModifyPreview';

const mockPreviewPositionModify = jest.fn();

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

jest.mock('./usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    previewPositionModify: mockPreviewPositionModify,
  }),
}));

const isolatedPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    symbol: 'ETH',
    size: '1',
    entryPrice: '2000',
    positionValue: '2000',
    marginUsed: '400',
    leverage: { type: 'isolated', value: 5 },
    liquidationPrice: '1640',
    maxLeverage: 25,
    ...overrides,
  }) as Position;

describe('usePerpsPositionModifyPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreviewPositionModify.mockResolvedValue({
      status: 'open',
      kind: 'increase',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resulting: {
        direction: 'long',
        size: 2,
        entryPrice: 2000,
        leverage: 10,
        margin: { available: true, value: 300 },
        liquidationPrice: { available: true, value: 1836 },
      },
    });
  });

  it('returns none when there is no position', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionModifyPreview({
        position: null,
        direction: 'long',
        size: '1',
        price: '2000',
        leverage: 10,
        reduceOnly: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual({ status: 'none' });
    });
    expect(mockPreviewPositionModify).not.toHaveBeenCalled();
  });

  it('skips the controller when disabled', async () => {
    const { result } = renderHook(() =>
      usePerpsPositionModifyPreview({
        position: isolatedPosition(),
        direction: 'long',
        size: '1',
        price: '2000',
        leverage: 10,
        reduceOnly: false,
        enabled: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual({ status: 'none' });
    });
    expect(mockPreviewPositionModify).not.toHaveBeenCalled();
  });

  it('calls previewPositionModify with the live position and order', async () => {
    const position = isolatedPosition();

    const { result } = renderHook(() =>
      usePerpsPositionModifyPreview({
        position,
        direction: 'long',
        size: '1',
        price: '2100',
        leverage: 10,
        reduceOnly: false,
        feeAmountUsd: 0.5,
      }),
    );

    await waitFor(() => {
      expect(result.current.preview.status).toBe('open');
    });

    expect(mockPreviewPositionModify).toHaveBeenCalledWith({
      position,
      direction: 'long',
      size: '1',
      price: '2100',
      leverage: 10,
      reduceOnly: false,
      feeAmountUsd: 0.5,
      providerId: undefined,
    });
    expect(result.current.preview).toMatchObject({
      status: 'open',
      kind: 'increase',
      resulting: { margin: { available: true, value: 300 } },
    });
  });

  it('falls back to none when the controller rejects', async () => {
    mockPreviewPositionModify.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() =>
      usePerpsPositionModifyPreview({
        position: isolatedPosition(),
        direction: 'long',
        size: '1',
        price: '2000',
        leverage: 10,
        reduceOnly: false,
      }),
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual({ status: 'none' });
      expect(result.current.error).toBe('offline');
    });
  });

  it('re-previews when leverage changes', async () => {
    const position = isolatedPosition();
    const { rerender } = renderHook(
      (props: { leverage: number }) =>
        usePerpsPositionModifyPreview({
          position,
          direction: 'long',
          size: '1',
          price: '2000',
          leverage: props.leverage,
          reduceOnly: false,
        }),
      { initialProps: { leverage: 5 } },
    );

    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      rerender({ leverage: 10 });
    });

    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(2);
    });
    expect(mockPreviewPositionModify).toHaveBeenLastCalledWith(
      expect.objectContaining({ leverage: 10 }),
    );
  });

  it('does not re-preview when the position object identity changes with the same fields', async () => {
    const { rerender } = renderHook(
      (props: { position: Position }) =>
        usePerpsPositionModifyPreview({
          position: props.position,
          direction: 'long',
          size: '1',
          price: '2000',
          leverage: 10,
          reduceOnly: false,
        }),
      { initialProps: { position: isolatedPosition() } },
    );

    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      rerender({
        position: isolatedPosition({ unrealizedPnl: '-12' }),
      });
    });

    expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
  });

  it('discards a superseded preview response', async () => {
    const firstRequest = createDeferred<PositionModifyPreviewResult>();
    const latestPreview: PositionModifyPreviewResult = {
      status: 'full_close',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resultingDirection: 'long',
    };
    mockPreviewPositionModify
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(latestPreview);
    const position = isolatedPosition();
    const { result, rerender } = renderHook(
      (props: { price: string }) =>
        usePerpsPositionModifyPreview({
          position,
          direction: 'long',
          size: '1',
          price: props.price,
          leverage: 10,
          reduceOnly: false,
        }),
      { initialProps: { price: '2000' } },
    );
    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
    });

    rerender({ price: '2100' });

    await waitFor(() => {
      expect(result.current.preview).toEqual(latestPreview);
    });
    await act(async () => {
      firstRequest.resolve({ status: 'none' });
    });
    expect(result.current.preview).toEqual(latestPreview);
  });

  it('keeps the last preview while a newer request is in flight', async () => {
    const firstPreview: PositionModifyPreviewResult = {
      status: 'open',
      kind: 'increase',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resulting: {
        direction: 'long',
        size: 1.5,
        entryPrice: 2000,
        leverage: 5,
        margin: { available: true, value: 350 },
        liquidationPrice: { available: true, value: 1700 },
      },
    };
    const secondRequest = createDeferred<PositionModifyPreviewResult>();
    const latestPreview: PositionModifyPreviewResult = {
      status: 'full_close',
      current: {
        margin: { available: true, value: 400 },
        liquidationPrice: { available: true, value: 1640 },
      },
      resultingDirection: 'long',
    };
    mockPreviewPositionModify
      .mockResolvedValueOnce(firstPreview)
      .mockReturnValueOnce(secondRequest.promise);
    const position = isolatedPosition();
    const { result, rerender } = renderHook(
      (props: { price: string }) =>
        usePerpsPositionModifyPreview({
          position,
          direction: 'long',
          size: '1',
          price: props.price,
          leverage: 10,
          reduceOnly: false,
        }),
      { initialProps: { price: '2000' } },
    );

    await waitFor(() => {
      expect(result.current.preview).toEqual(firstPreview);
    });

    rerender({ price: '2100' });

    expect(result.current.preview).toEqual(firstPreview);
    expect(result.current.isCalculating).toBe(true);

    await act(async () => {
      secondRequest.resolve(latestPreview);
    });
    await waitFor(() => {
      expect(result.current.preview).toEqual(latestPreview);
    });
  });

  it('stops gating submission once a preview has settled', async () => {
    const pendingRecalculation = createDeferred<PositionModifyPreviewResult>();
    const position = isolatedPosition();
    const { result, rerender } = renderHook(
      (props: { price: string }) =>
        usePerpsPositionModifyPreview({
          position,
          direction: 'long',
          size: '1',
          price: props.price,
          leverage: 10,
          reduceOnly: false,
        }),
      { initialProps: { price: '2000' } },
    );

    expect(result.current.isAwaitingFirstPreview).toBe(true);
    await waitFor(() => {
      expect(result.current.preview.status).toBe('open');
    });

    // Live price ticks re-request the preview; the retained result stays usable.
    mockPreviewPositionModify.mockReturnValueOnce(pendingRecalculation.promise);
    rerender({ price: '2100' });

    expect(result.current.isCalculating).toBe(true);
    expect(result.current.isAwaitingFirstPreview).toBe(false);

    await act(async () => {
      pendingRecalculation.resolve({ status: 'none' });
    });
  });

  it('gates submission again when the previewed position changes', async () => {
    const nextPositionRequest = createDeferred<PositionModifyPreviewResult>();
    const ethPosition = isolatedPosition({ symbol: 'ETH' });
    const btcPosition = isolatedPosition({ symbol: 'BTC' });
    const { result, rerender } = renderHook(
      (props: { position: Position }) =>
        usePerpsPositionModifyPreview({
          position: props.position,
          direction: 'long',
          size: '1',
          price: '2000',
          leverage: 10,
          reduceOnly: false,
        }),
      { initialProps: { position: ethPosition } },
    );
    await waitFor(() => {
      expect(result.current.isAwaitingFirstPreview).toBe(false);
    });

    mockPreviewPositionModify.mockReturnValueOnce(nextPositionRequest.promise);
    rerender({ position: btcPosition });

    await waitFor(() => {
      expect(result.current.isAwaitingFirstPreview).toBe(true);
    });
    expect(result.current.preview).toEqual({ status: 'none' });

    await act(async () => {
      nextPositionRequest.resolve({ status: 'none' });
    });
    await waitFor(() => {
      expect(result.current.isAwaitingFirstPreview).toBe(false);
    });
  });

  it('discards a superseded preview rejection', async () => {
    const firstRequest = createDeferred<PositionModifyPreviewResult>();
    mockPreviewPositionModify
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce({ status: 'none' });
    const position = isolatedPosition();
    const { result, rerender } = renderHook(
      (props: { leverage: number }) =>
        usePerpsPositionModifyPreview({
          position,
          direction: 'long',
          size: '1',
          price: '2000',
          leverage: props.leverage,
          reduceOnly: false,
        }),
      { initialProps: { leverage: 5 } },
    );
    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
    });

    rerender({ leverage: 10 });
    await waitFor(() => {
      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      firstRequest.reject(new Error('stale failure'));
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  describe('debounceMs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('coalesces rapid price ticks into one controller call', async () => {
      const position = isolatedPosition();
      const { rerender } = renderHook(
        (props: { price: string }) =>
          usePerpsPositionModifyPreview(
            {
              position,
              direction: 'long',
              size: '1',
              price: props.price,
              leverage: 10,
              reduceOnly: false,
            },
            { debounceMs: 300 },
          ),
        { initialProps: { price: '2000' } },
      );

      rerender({ price: '2100' });
      rerender({ price: '2200' });
      expect(mockPreviewPositionModify).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(mockPreviewPositionModify).toHaveBeenCalledTimes(1);
      expect(mockPreviewPositionModify).toHaveBeenCalledWith(
        expect.objectContaining({ price: '2200' }),
      );
    });
  });
});
