import { useSyncExternalStore } from 'react';
import type { MMPayOnRampIntent } from '../../../../UI/Ramp/types';

export interface MMPayOnRampSession extends MMPayOnRampIntent {
  assetId: string;
  orderId?: string;
}

const sessions = new Map<string, MMPayOnRampSession>();
const listeners = new Set<() => void>();

/**
 * Starts or replaces the MM-pay on-ramp session for a transaction id.
 */
export function startMMPayOnRampSession(
  session: Omit<MMPayOnRampSession, 'source'>,
) {
  const nextSession: MMPayOnRampSession = {
    ...session,
    source: 'mm_pay',
  };

  sessions.set(session.mmPayTransactionId, nextSession);
  notifyListeners();

  return nextSession;
}

/**
 * Binds a created fiat order id to an existing MM-pay on-ramp session.
 */
export function bindMMPayOnRampOrder(
  mmPayTransactionId: string,
  orderId: string,
) {
  const existing = sessions.get(mmPayTransactionId);

  if (!existing || existing.orderId === orderId) {
    return;
  }

  sessions.set(mmPayTransactionId, {
    ...existing,
    orderId,
  });
  notifyListeners();
}

/**
 * Clears the MM-pay on-ramp session for a transaction id.
 */
export function clearMMPayOnRampSession(mmPayTransactionId: string) {
  if (!sessions.has(mmPayTransactionId)) {
    return;
  }

  sessions.delete(mmPayTransactionId);
  notifyListeners();
}

/**
 * Reactively subscribes to the MM-pay on-ramp session for a transaction id.
 */
export function useMMPayOnRampSession(mmPayTransactionId?: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(mmPayTransactionId),
    () => getSnapshot(mmPayTransactionId),
  );
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(mmPayTransactionId?: string | null) {
  if (!mmPayTransactionId) {
    return null;
  }

  return sessions.get(mmPayTransactionId) ?? null;
}
