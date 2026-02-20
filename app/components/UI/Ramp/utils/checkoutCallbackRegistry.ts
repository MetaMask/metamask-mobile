type NavStateCallback = (navState: { url: string }) => void;

const callbacks = new Map<string, NavStateCallback>();

let counter = 0;

export function registerCheckoutCallback(callback: NavStateCallback): string {
  counter += 1;
  const key = `checkout-cb-${counter}-${Date.now()}`;
  callbacks.set(key, callback);
  return key;
}

export function getCheckoutCallback(key: string): NavStateCallback | undefined {
  return callbacks.get(key);
}

export function removeCheckoutCallback(key: string): void {
  callbacks.delete(key);
}
