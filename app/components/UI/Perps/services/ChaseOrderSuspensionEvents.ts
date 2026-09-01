import type { ChaseOrder } from '@metamask/perps-controller';

type ChaseOrderSuspensionListener = (orders: ChaseOrder[]) => void;

const listeners = new Set<ChaseOrderSuspensionListener>();

export const reportSuspendedChaseOrders = (orders: ChaseOrder[]) => {
  if (orders.length === 0) return;
  listeners.forEach((listener) => listener(orders));
};

export const subscribeToSuspendedChaseOrders = (
  listener: ChaseOrderSuspensionListener,
) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
