type QuickBuyErrorCallback = (errorMessage: string) => void;

const quickBuyErrorCallbacks = new Map<string, QuickBuyErrorCallback>();

let counter = 0;

export function registerQuickBuyErrorCallback(
  callback: QuickBuyErrorCallback,
): string {
  counter += 1;
  const key = `quick-buy-cb-${counter}-${Date.now()}`;
  quickBuyErrorCallbacks.set(key, callback);
  return key;
}

export function getQuickBuyErrorCallback(
  key: string,
): QuickBuyErrorCallback | undefined {
  return quickBuyErrorCallbacks.get(key);
}

export function removeQuickBuyErrorCallback(key: string): void {
  quickBuyErrorCallbacks.delete(key);
}

export function clearAllQuickBuyErrorCallbacks(): void {
  quickBuyErrorCallbacks.clear();
}
