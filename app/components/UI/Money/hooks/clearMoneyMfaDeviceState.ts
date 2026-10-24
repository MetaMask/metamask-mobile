import { moneyAccountMigration } from './moneyAccountMigration';
import { moneyMfaStore } from './moneyMfaStore';

/**
 * Forgets the Money 2FA verification and migration state saved on the device,
 * so a reset or new wallet starts without it.
 */
export const clearMoneyMfaDeviceState = async (): Promise<void> => {
  await Promise.all([moneyMfaStore.clear(), moneyAccountMigration.clear()]);
};
