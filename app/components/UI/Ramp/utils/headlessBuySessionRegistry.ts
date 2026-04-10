import { extractOrderCode } from './extractOrderCode';

const headlessBuySessions = new Map<string, Set<string>>();

let sessionCounter = 0;

function normalizeOrderId(orderId: string): string {
  return extractOrderCode(orderId.trim());
}

export function registerHeadlessBuySession(): string {
  sessionCounter += 1;
  const sessionId = `headless-buy-${sessionCounter}-${Date.now()}`;
  headlessBuySessions.set(sessionId, new Set());
  return sessionId;
}

export function unregisterHeadlessBuySession(sessionId: string): void {
  headlessBuySessions.delete(sessionId);
}

export function resetHeadlessBuySession(sessionId: string): void {
  headlessBuySessions.set(sessionId, new Set());
}

export function trackHeadlessBuyOrder(
  sessionId: string | undefined,
  orderId: string,
): void {
  if (!sessionId) {
    return;
  }

  const trackedOrders = headlessBuySessions.get(sessionId);
  if (!trackedOrders) {
    return;
  }

  trackedOrders.add(normalizeOrderId(orderId));
}

export function isTrackedHeadlessBuyOrder(
  sessionId: string,
  orderId: string,
): boolean {
  const trackedOrders = headlessBuySessions.get(sessionId);
  if (!trackedOrders) {
    return false;
  }

  return trackedOrders.has(normalizeOrderId(orderId));
}
