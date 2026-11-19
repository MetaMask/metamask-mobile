import { moneyAccountMigration } from './moneyAccountMigration';
import { moneyMfaStore } from './moneyMfaStore';
import { moneyMfaHomePromptSession } from './moneyMfaHomePromptSession';

export const clearMoneyMfaDeviceState = async (): Promise<void> => {
  moneyMfaHomePromptSession.reset();
  await Promise.all([moneyMfaStore.clear(), moneyAccountMigration.clear()]);
};
