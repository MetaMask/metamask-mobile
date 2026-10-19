import type { ChaseOrder } from '@metamask/perps-controller';
import {
  reportSuspendedChaseOrders,
  resetSuspendedChaseOrderBufferForTests,
  subscribeToSuspendedChaseOrders,
} from './ChaseOrderSuspensionEvents';

const createSuspendedOrder = (handle: string): ChaseOrder =>
  ({
    handle,
    symbol: 'SOL',
    status: 'backgrounded',
  }) as ChaseOrder;

describe('ChaseOrderSuspensionEvents', () => {
  beforeEach(() => {
    resetSuspendedChaseOrderBufferForTests();
  });

  afterEach(() => {
    resetSuspendedChaseOrderBufferForTests();
  });

  it('flushes one buffered order per handle to the next subscriber', () => {
    const listener = jest.fn();
    const order = createSuspendedOrder('late-order');
    reportSuspendedChaseOrders([order]);
    reportSuspendedChaseOrders([order]);

    const unsubscribe = subscribeToSuspendedChaseOrders(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith([order]);
    unsubscribe();

    const nextListener = jest.fn();
    const unsubscribeNext = subscribeToSuspendedChaseOrders(nextListener);
    expect(nextListener).not.toHaveBeenCalled();
    unsubscribeNext();
  });

  it('retains the newest 100 suspended orders while no subscriber is mounted', () => {
    const listener = jest.fn();
    const orders = Array.from({ length: 101 }, (_, index) =>
      createSuspendedOrder(`late-order-${index}`),
    );
    reportSuspendedChaseOrders(orders);

    const unsubscribe = subscribeToSuspendedChaseOrders(listener);

    const flushedOrders = listener.mock.calls[0][0] as ChaseOrder[];
    expect(flushedOrders).toHaveLength(100);
    expect(flushedOrders[0].handle).toBe('late-order-1');
    expect(flushedOrders.at(-1)?.handle).toBe('late-order-100');
    unsubscribe();
  });
});
