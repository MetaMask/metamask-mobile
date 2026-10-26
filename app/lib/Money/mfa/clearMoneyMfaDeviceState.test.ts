import StorageWrapper from '../../../store/storage-wrapper';
import { clearMoneyMfaDeviceState } from './clearMoneyMfaDeviceState';
import { MONEY_MFA_STORAGE_KEY, moneyMfaStore } from './moneyMfaStore';
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

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountController: {
        createMoneyAccount: jest.fn(() => Promise.resolve({ id: 'mpc' })),
        setDefaultMoneyAccount: jest.fn(),
      },
    },
  },
}));

describe('clearMoneyMfaDeviceState', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resets 2FA verification and migration and removes the saved values', async () => {
    moneyMfaStore.setState({
      isMoneyAccountMfaEnabled: true,
      isMigrationBannerDismissed: true,
    });
    await moneyAccountMigration.start();

    await clearMoneyMfaDeviceState();

    expect(moneyMfaStore.getState()).toEqual({
      isMoneyAccountMfaEnabled: false,
      isMigrationBannerDismissed: false,
    });
    expect(moneyAccountMigration.getStatus()).toBe('not_started');
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      MONEY_MFA_STORAGE_KEY,
    );
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      MONEY_ACCOUNT_MIGRATION_STORAGE_KEY,
    );
  });
});
