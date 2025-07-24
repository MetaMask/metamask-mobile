import DappPortRegistry from './DappPortRegistry';

/**
 * Gets the URL for the first test dapp using the registered port
 * @returns The URL for the first test dapp
 */
export function getFirstDappUrl(): string {
  const port = DappPortRegistry.getInstance().getFirstDappPort();
  if (!port) {
    throw new Error('First dapp port not registered. Make sure the dapp server has been started.');
  }
  return `http://localhost:${port}`;
}

/**
 * Gets the URL for the second test dapp using the registered port
 * @returns The URL for the second test dapp
 */
export function getSecondDappUrl(): string {
  const port = DappPortRegistry.getInstance().getSecondDappPort();
  if (!port) {
    throw new Error('Second dapp port not registered. Make sure the dapp server has been started.');
  }

  // Use the appropriate host based on platform
  const host = device.getPlatform() === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:${port}`;
}

/**
 * Gets the URL for a dapp by its variant
 * @param variant The dapp variant
 * @returns The URL for the dapp
 */
export function getDappUrlByVariant(variant: string): string {
  const port = DappPortRegistry.getInstance().getPortByVariant(variant);
  if (!port) {
    throw new Error(`Dapp port for variant ${variant} not registered. Make sure the dapp server has been started.`);
  }

  const host = device.getPlatform() === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:${port}`;
}

/**
 * Gets the URL for a dapp by its index
 * @param index The dapp index
 * @returns The URL for the dapp
 */
export function getDappUrlByIndex(index: number): string {
  const port = DappPortRegistry.getInstance().getPortByIndex(index);
  if (!port) {
    throw new Error(`Dapp port for index ${index} not registered. Make sure the dapp server has been started.`);
  }

  const host = device.getPlatform() === 'android' ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:${port}`;
}
