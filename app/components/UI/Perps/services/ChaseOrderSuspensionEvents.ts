import type { ChaseOrder } from '@metamask/perps-controller';

type ChaseOrderSuspensionListener = (orders: ChaseOrder[]) => void;

const listeners = new Set<ChaseOrderSuspensionListener>();
const MAX_PENDING_SUSPENDED_ORDERS = 100;
const pendingOrders = new Map<string, ChaseOrder>();

export const reportSuspendedChaseOrders = (orders: ChaseOrder[]) => {
  if (orders.length === 0) return;
  if (listeners.size === 0) {
    // Wallet-root teardown can finish before a timed-out controller call does.
    // Keep only a bounded set for the next provider mount.
    orders.forEach((order) => {
      pendingOrders.delete(order.handle);
      pendingOrders.set(order.handle, order);
    });
    while (pendingOrders.size > MAX_PENDING_SUSPENDED_ORDERS) {
      const oldestHandle = pendingOrders.keys().next().value;
      if (oldestHandle === undefined) break;
      pendingOrders.delete(oldestHandle);
    }
    return;
  }
  listeners.forEach((listener) => listener(orders));
};

export const subscribeToSuspendedChaseOrders = (
  listener: ChaseOrderSuspensionListener,
) => {
  listeners.add(listener);
  if (pendingOrders.size > 0) {
    const orders = [...pendingOrders.values()];
    pendingOrders.clear();
    listener(orders);
  }
  return () => listeners.delete(listener);
};

export const resetSuspendedChaseOrderBufferForTests = () => {
  pendingOrders.clear();
};
