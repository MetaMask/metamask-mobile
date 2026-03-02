type QuickBuyErrorCallback = (errorMessage: string) => void;
type QuickBuySuccessCallback = (orderId: string) => void;

const quickBuyErrorCallbacks = new Map<string, QuickBuyErrorCallback>();
const quickBuySuccessCallbacks = new Map<string, QuickBuySuccessCallback>();

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

export function registerQuickBuySuccessCallback(
  callback: QuickBuySuccessCallback,
): string {
  counter += 1;
  const key = `quick-buy-success-cb-${counter}-${Date.now()}`;
  quickBuySuccessCallbacks.set(key, callback);
  return key;
}

export function getQuickBuySuccessCallback(
  key: string,
): QuickBuySuccessCallback | undefined {
  return quickBuySuccessCallbacks.get(key);
}

export function removeQuickBuySuccessCallback(key: string): void {
  quickBuySuccessCallbacks.delete(key);
}
