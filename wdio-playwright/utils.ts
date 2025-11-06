import type { Client } from 'webdriver';

export function getDriver(): Client {
  const drv = (globalThis as any).driver as Client | undefined;
  if (!drv) throw new Error('driver is not available');
  return drv;
}