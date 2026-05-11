import { renderHook, act } from '@testing-library/react-hooks';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import { TransactionStatus } from '@metamask/transaction-controller';

import Engine from '../../../../../core/Engine';
import { useFiatOrderStatus } from './useFiatOrderStatus';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrder: jest.fn(),
    },
  },
}));

const getOrderMock = jest.mocked(Engine.context.RampsController.getOrder);

function flushPromises() {
  return act(async () => {
    await Promise.resolve();
  });
}

describe('useFiatOrderStatus', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call getOrder when fiatOrderId is missing', () => {
    renderHook(() =>
      useFiatOrderStatus(
        undefined,
        'provider',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not call getOrder when fiatProvider is missing', () => {
    renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        undefined,
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('does not call getOrder when walletAddress is missing', () => {
    renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'provider',
        undefined,
        TransactionStatus.submitted,
      ),
    );

    expect(getOrderMock).not.toHaveBeenCalled();
  });

  it('derives success from confirmed parent transaction before API responds', () => {
    getOrderMock.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.confirmed,
      ),
    );

    expect(result.current.severity).toBe('success');
    expect(result.current.statusText).toBe('Completed');
  });

  it('derives error from failed parent transaction before API responds', () => {
    getOrderMock.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.failed,
      ),
    );

    expect(result.current.severity).toBe('error');
    expect(result.current.statusText).toBe('Failed');
  });

  it('returns success severity when order status is Completed', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Completed,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('success');
    expect(result.current.statusText).toBe('Completed');
    expect(getOrderMock).toHaveBeenCalledWith('transak', 'order-id', '0x123');
  });

  it('returns error severity when order status is Failed', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Failed,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('error');
    expect(result.current.statusText).toBe('Failed');
  });

  it('returns error severity when order status is Cancelled', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Cancelled,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('error');
    expect(result.current.statusText).toBe('Cancelled');
  });

  it('returns error severity when order status is IdExpired', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.IdExpired,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('error');
    expect(result.current.statusText).toBe('Expired');
  });

  it('returns warning severity when order status is Pending', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Pending,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('warning');
    expect(result.current.statusText).toBe('Pending');
  });

  it('falls back to parent transaction status when getOrder rejects', async () => {
    getOrderMock.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.confirmed,
      ),
    );

    await flushPromises();

    expect(result.current.severity).toBe('success');
    expect(result.current.statusText).toBe('Completed');
  });

  it('stops polling after terminal status is reached', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Completed,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();

    const callCountAfterFirstPoll = getOrderMock.mock.calls.length;

    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(getOrderMock.mock.calls.length).toBe(callCountAfterFirstPoll);
  });

  it('clears interval on unmount', async () => {
    getOrderMock.mockResolvedValue({
      status: RampsOrderStatus.Pending,
    } as ReturnType<typeof getOrderMock> extends Promise<infer T> ? T : never);

    const { unmount } = renderHook(() =>
      useFiatOrderStatus(
        'order-id',
        'transak',
        '0x123',
        TransactionStatus.submitted,
      ),
    );

    await flushPromises();
    getOrderMock.mockClear();

    unmount();

    jest.advanceTimersByTime(10000);
    expect(getOrderMock).not.toHaveBeenCalled();
  });
});
