import StorageWrapper from '../../../store/storage-wrapper';
import { clearMoneyMfaDeviceState } from './clearMoneyMfaDeviceState';
import { MONEY_MFA_STORAGE_KEY, moneyMfaStore } from './moneyMfaStore';
import { moneyMfaHomePromptSession } from './moneyMfaHomePromptSession';
import {
  MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
  moneyAccountMigration,
} from './moneyAccountMigration';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

describe('clearMoneyMfaDeviceState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('resets 2FA verification, migration and the home prompt, and removes the saved values', async () => {
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: true,
      isMigrationBannerDismissed: true,
      isHomePromptDismissed: true,
    });
    moneyMfaHomePromptSession.markPrompted();
    const migration = moneyAccountMigration.start();
    jest.runAllTimers();
    await migration;

    await clearMoneyMfaDeviceState();

    expect(moneyMfaStore.getState()).toEqual({
      isMoneyAccountMfaEnabled: false,
      isMigrationBannerDismissed: false,
      isHomePromptDismissed: false,
    });
    expect(moneyMfaHomePromptSession.hasPrompted()).toBe(false);
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      MONEY_MFA_STORAGE_KEY,
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
    );
  });
});
