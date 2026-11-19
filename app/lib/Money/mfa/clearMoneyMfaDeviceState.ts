import { moneyAccountMigration } from './moneyAccountMigration';
import { moneyMfaStore } from './moneyMfaStore';
import { moneyMfaHomePromptSession } from './moneyMfaHomePromptSession';
import { moneyAccountRestore } from './moneyAccountRestore';

export const clearMoneyMfaDeviceState = async (): Promise<void> => {
  moneyMfaHomePromptSession.reset();
  moneyAccountRestore.reset();
  await Promise.all([moneyMfaStore.clear(), moneyAccountMigration.clear()]);
};
