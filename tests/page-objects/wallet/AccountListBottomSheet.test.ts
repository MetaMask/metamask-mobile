jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {
    scrollIntoView: jest.fn(),
    waitAndTap: jest.fn(),
    swipe: jest.fn(),
    longPress: jest.fn(),
  },
}));

jest.mock('../../framework', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
  getDriver: jest.fn(),
  LogLevel: { DEBUG: 'debug' },
  sleep: jest.fn(),
  Utilities: {
    executeWithRetry: jest.fn(async (operation: () => Promise<unknown>) =>
      operation(),
    ),
  },
}));

import Gestures from '../../framework/Gestures';
import { Utilities, type AppiumElement } from '../../framework';
import AccountListBottomSheet from './AccountListBottomSheet';

function createCell(
  isVisible = jest.fn().mockResolvedValue(true),
): AppiumElement {
  return { isVisible } as unknown as AppiumElement;
}

describe('AccountListBottomSheet account creation visibility', () => {
  beforeEach(() => {
    jest
      .spyOn(Utilities, 'executeWithRetry')
      .mockImplementation(async (operation) => operation());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('addAccountAndExpectVisibleV2', () => {
    let getAccountElementsByAccountNameV2: jest.SpyInstance<
      Promise<AppiumElement[]>,
      [accountName: string, exactMatch?: boolean]
    >;
    let tapAddAccountButtonV2: jest.SpyInstance<
      Promise<void>,
      [options?: { srpIndex?: number; shouldWait?: boolean }]
    >;
    let expectAccountVisibleByNameV2: jest.SpyInstance<
      Promise<void>,
      [
        accountName: string,
        options?: { description?: string; timeout?: number },
      ]
    >;

    beforeEach(() => {
      getAccountElementsByAccountNameV2 = jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([]);
      tapAddAccountButtonV2 = jest
        .spyOn(AccountListBottomSheet, 'tapAddAccountButtonV2')
        .mockResolvedValue();
      expectAccountVisibleByNameV2 = jest
        .spyOn(AccountListBottomSheet, 'expectAccountVisibleByNameV2')
        .mockResolvedValue();
    });

    it('taps Add account when no row exists and waits for the named row', async () => {
      await AccountListBottomSheet.addAccountAndExpectVisibleV2('Account 3');

      expect(tapAddAccountButtonV2).toHaveBeenCalledWith(undefined);
      expect(expectAccountVisibleByNameV2).toHaveBeenCalledWith('Account 3', {
        timeout: 15000,
        description: 'Account 3 visible after Add account',
      });
      expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          timeout: 50000,
          interval: 1000,
          description: 'Add account and expect "Account 3" visible',
        },
      );
    });

    it('skips Add account when the named row is already present', async () => {
      getAccountElementsByAccountNameV2.mockResolvedValue([createCell()]);

      await AccountListBottomSheet.addAccountAndExpectVisibleV2('Account 3');

      expect(tapAddAccountButtonV2).not.toHaveBeenCalled();
      expect(expectAccountVisibleByNameV2).toHaveBeenCalledWith('Account 3', {
        timeout: 15000,
        description: 'Account 3 visible after Add account',
      });
    });

    it('forwards srp index and wait flag only to the Add account tap', async () => {
      await AccountListBottomSheet.addAccountAndExpectVisibleV2('Account 3', {
        srpIndex: 1,
        shouldWait: true,
      });

      expect(tapAddAccountButtonV2).toHaveBeenCalledWith({
        srpIndex: 1,
        shouldWait: true,
      });
      expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ timeout: 50000 }),
      );
    });

    it('uses the caller timeout for the retry and keeps the inner visibility wait at 15s', async () => {
      await AccountListBottomSheet.addAccountAndExpectVisibleV2('Account 2', {
        timeout: 12000,
      });

      expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          timeout: 12000,
          interval: 1000,
          description: 'Add account and expect "Account 2" visible',
        }),
      );
      expect(expectAccountVisibleByNameV2).toHaveBeenCalledWith('Account 2', {
        timeout: 15000,
        description: 'Account 2 visible after Add account',
      });
    });

    it('rejects with the missing-row error from the visibility check after tapping', async () => {
      expectAccountVisibleByNameV2.mockRejectedValue(
        new Error('No account row found for "Account 3"'),
      );

      await expect(
        AccountListBottomSheet.addAccountAndExpectVisibleV2('Account 3'),
      ).rejects.toThrow('No account row found for "Account 3"');

      expect(tapAddAccountButtonV2).toHaveBeenCalledTimes(1);
    });
  });

  describe('expectAccountVisibleByNameV2', () => {
    it('rejects when no account row exists and does not scroll', async () => {
      jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([]);

      await expect(
        AccountListBottomSheet.expectAccountVisibleByNameV2('Account 3'),
      ).rejects.toThrow('No account row found for "Account 3"');

      expect(Gestures.scrollIntoView).not.toHaveBeenCalled();
      expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          timeout: 15000,
          interval: 500,
          description: 'Account 3 should be visible in account list',
        },
      );
    });

    it('scrolls up once when that direction reveals the row', async () => {
      const cell = createCell(jest.fn().mockResolvedValue(true));
      jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([cell]);
      jest.mocked(Gestures.scrollIntoView).mockResolvedValue(undefined);

      await AccountListBottomSheet.expectAccountVisibleByNameV2('Account 3');

      expect(Gestures.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(Gestures.scrollIntoView).toHaveBeenCalledWith(cell, {
        direction: 'up',
        maxScrolls: 10,
      });
    });

    it('scrolls down after an upward scroll error when the row is then visible', async () => {
      const cell = createCell(jest.fn().mockResolvedValue(true));
      jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([cell]);
      jest
        .mocked(Gestures.scrollIntoView)
        .mockRejectedValueOnce(new Error('scroll up failed'))
        .mockResolvedValueOnce(undefined);

      await AccountListBottomSheet.expectAccountVisibleByNameV2('Account 3');

      expect(Gestures.scrollIntoView).toHaveBeenNthCalledWith(1, cell, {
        direction: 'up',
        maxScrolls: 10,
      });
      expect(Gestures.scrollIntoView).toHaveBeenNthCalledWith(2, cell, {
        direction: 'down',
        maxScrolls: 10,
      });
    });

    it('rejects when both scroll directions leave the row hidden', async () => {
      const cell = createCell(jest.fn().mockResolvedValue(false));
      jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([cell]);
      jest.mocked(Gestures.scrollIntoView).mockResolvedValue(undefined);

      await expect(
        AccountListBottomSheet.expectAccountVisibleByNameV2('Account 3'),
      ).rejects.toThrow('Account row "Account 3" is not visible');
    });

    it('forwards timeout and description into the retry options', async () => {
      jest
        .spyOn(AccountListBottomSheet, 'getAccountElementsByAccountNameV2')
        .mockResolvedValue([]);

      await expect(
        AccountListBottomSheet.expectAccountVisibleByNameV2('Account 2', {
          timeout: 12000,
          description: 'Account 2 should be visible',
        }),
      ).rejects.toThrow('No account row found for "Account 2"');

      expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        {
          timeout: 12000,
          interval: 500,
          description: 'Account 2 should be visible',
        },
      );
    });
  });
});
