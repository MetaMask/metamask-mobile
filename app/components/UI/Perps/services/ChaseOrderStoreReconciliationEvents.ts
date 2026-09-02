import type { ChaseOrder } from '@metamask/perps-controller';

export interface ChaseOrderRouteIdentity {
  account: string;
  provider: string;
  network: string;
}

export interface ChaseOrderStoreReconciliationEvent {
  orders: ChaseOrder[];
  route: ChaseOrderRouteIdentity;
}

type ChaseOrderStoreReconciliationListener = (
  event: ChaseOrderStoreReconciliationEvent,
) => void;

const listeners = new Set<ChaseOrderStoreReconciliationListener>();

export const reportChaseOrderStoreReconciliation = (
  event: ChaseOrderStoreReconciliationEvent,
) => listeners.forEach((listener) => listener(event));

export const subscribeToChaseOrderStoreReconciliation = (
  listener: ChaseOrderStoreReconciliationListener,
) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
