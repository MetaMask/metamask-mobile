import StorageWrapper from '../../../store/storage-wrapper';
import { clearMoneyMfaDeviceState } from './clearMoneyMfaDeviceState';
import { MONEY_MFA_STORAGE_KEY, moneyMfaStore } from './moneyMfaStore';
import { moneyMfaHomePromptSession } from './moneyMfaHomePromptSession';
import {
  MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
  moneyAccountMigration,
} from './moneyAccountMigration';
import { moneyAccountRestore } from './moneyAccountRestore';
import { restoreMpcMoneyAccount } from './restoreMpcMoneyAccount';

jest.mock('./restoreMpcMoneyAccount', () => ({
  restoreMpcMoneyAccount: jest.fn(),
}));

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(async () => Promise.resolve()),
    removeItem: jest.fn(async () => Promise.resolve()),
  },
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountLifecycleController: {
        startMigration: jest.fn(async () => Promise.resolve()),
        refresh: jest.fn(async () => Promise.resolve()),
        state: { moneyAccounts: {} },
      },
    },
  },
}));

describe('clearMoneyMfaDeviceState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resets 2FA verification, migration and the home prompt, and removes the saved values', async () => {
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: true,
      isMigrationBannerDismissed: true,
      isHomePromptDismissed: true,
      hasUnseenEnabledConfirmation: false,
    });
    moneyMfaHomePromptSession.markPrompted();
    await moneyAccountMigration.start();

    await clearMoneyMfaDeviceState();

    expect(moneyMfaStore.getState()).toEqual({
      isMoneyAccountMfaEnabled: false,
      isMigrationBannerDismissed: false,
      isHomePromptDismissed: false,
      hasUnseenEnabledConfirmation: false,
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

  it('clears a failed Money account sign-in', async () => {
    jest
      .mocked(restoreMpcMoneyAccount)
      .mockRejectedValue(new Error('restore failed'));
    await moneyAccountRestore.restore('0xabc');

    await clearMoneyMfaDeviceState();

    expect(moneyAccountRestore.getStatus()).toBe('idle');
  });
});
