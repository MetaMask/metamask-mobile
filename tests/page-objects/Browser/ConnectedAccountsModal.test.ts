jest.mock('../../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
    expectTextDisplayed: jest.fn(),
  },
}));

jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
    getElementByText: jest.fn(),
  },
}));

jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn(),
  },
}));

jest.mock('../../framework/Utilities', () => ({
  __esModule: true,
  default: {
    waitForElementToDisappear: jest.fn(),
  },
}));

import type { AppiumElement } from '../../framework';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import ConnectedAccountsModal from './ConnectedAccountsModal';

const EDIT_ACCOUNTS_ID = 'account-list-bottom-sheet';
const DISCONNECT_ALL_ID = 'disconnect_all';
const CONFIRM_DISCONNECT_ID = 'confirm_disconnect_networks';

const editAccountsSentinel = {
  id: EDIT_ACCOUNTS_ID,
} as unknown as AppiumElement;
const disconnectAllSentinel = {
  id: DISCONNECT_ALL_ID,
} as unknown as AppiumElement;
const confirmDisconnectSentinel = {
  id: CONFIRM_DISCONNECT_ID,
} as unknown as AppiumElement;

describe('ConnectedAccountsModal account summary', () => {
  beforeEach(() => {
    jest.mocked(Matchers.getElementByID).mockImplementation((elementId) => {
      if (elementId === EDIT_ACCOUNTS_ID) {
        return Promise.resolve(editAccountsSentinel);
      }
      if (elementId === DISCONNECT_ALL_ID) {
        return Promise.resolve(disconnectAllSentinel);
      }
      if (elementId === CONFIRM_DISCONNECT_ID) {
        return Promise.resolve(confirmDisconnectSentinel);
      }
      return Promise.resolve({
        id: String(elementId),
      } as unknown as AppiumElement);
    });
    jest.mocked(Assertions.expectElementToBeVisible).mockResolvedValue();
    jest.mocked(Assertions.expectTextDisplayed).mockResolvedValue();
    jest.mocked(Gestures.waitAndTap).mockResolvedValue();
    jest.mocked(Utilities.waitForElementToDisappear).mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('waitForAccountsSummaryReady', () => {
    it('waits for edit accounts and then disconnect all with the default timeout', async () => {
      await ConnectedAccountsModal.waitForAccountsSummaryReady();

      const calls = jest.mocked(Assertions.expectElementToBeVisible).mock.calls;

      await expect(Promise.resolve(calls[0][0])).resolves.toBe(
        editAccountsSentinel,
      );
      expect(calls[0][1]).toEqual({
        timeout: 20000,
        description: 'Edit accounts control on the connected accounts sheet',
      });
      await expect(Promise.resolve(calls[1][0])).resolves.toBe(
        disconnectAllSentinel,
      );
      expect(calls[1][1]).toEqual({
        timeout: 20000,
        description: 'Disconnect all accounts and networks control',
      });
    });

    it('passes a custom timeout to both visibility checks', async () => {
      await ConnectedAccountsModal.waitForAccountsSummaryReady(5000);

      const calls = jest.mocked(Assertions.expectElementToBeVisible).mock.calls;

      await expect(Promise.resolve(calls[0][0])).resolves.toBe(
        editAccountsSentinel,
      );
      expect(calls[0][1]).toEqual(expect.objectContaining({ timeout: 5000 }));
      await expect(Promise.resolve(calls[1][0])).resolves.toBe(
        disconnectAllSentinel,
      );
      expect(calls[1][1]).toEqual(expect.objectContaining({ timeout: 5000 }));
    });

    it('does not query disconnect all when edit accounts is not visible', async () => {
      jest
        .mocked(Assertions.expectElementToBeVisible)
        .mockRejectedValueOnce(new Error('edit accounts missing'));

      await expect(
        ConnectedAccountsModal.waitForAccountsSummaryReady(),
      ).rejects.toThrow('edit accounts missing');

      expect(Matchers.getElementByID).not.toHaveBeenCalledWith(
        DISCONNECT_ALL_ID,
      );
    });
  });

  describe('expectConnectedAccountDisplayed', () => {
    it('waits for the sheet with defaults and then the account name', async () => {
      const ready = jest.spyOn(
        ConnectedAccountsModal,
        'waitForAccountsSummaryReady',
      );

      await ConnectedAccountsModal.expectConnectedAccountDisplayed('Account 1');

      expect(ready).toHaveBeenCalledWith();
      expect(Assertions.expectTextDisplayed).toHaveBeenCalledWith('Account 1', {
        timeout: 30000,
        description: '"Account 1" in connected accounts summary',
      });
    });

    it('applies a custom timeout only to the account name assertion', async () => {
      const ready = jest.spyOn(
        ConnectedAccountsModal,
        'waitForAccountsSummaryReady',
      );

      await ConnectedAccountsModal.expectConnectedAccountDisplayed(
        'Account 1',
        { timeout: 45000 },
      );

      expect(ready).toHaveBeenCalledWith();
      expect(Assertions.expectTextDisplayed).toHaveBeenCalledWith('Account 1', {
        timeout: 45000,
        description: '"Account 1" in connected accounts summary',
      });
    });
  });

  describe('expectConnectedAccountsDisplayed', () => {
    it('waits for the sheet once, then asserts each account name', async () => {
      const ready = jest.spyOn(
        ConnectedAccountsModal,
        'waitForAccountsSummaryReady',
      );

      await ConnectedAccountsModal.expectConnectedAccountsDisplayed([
        'Account 1',
        'Account 2',
        'Account 3',
      ]);

      expect(ready).toHaveBeenCalledTimes(1);
      expect(Assertions.expectTextDisplayed).toHaveBeenNthCalledWith(
        1,
        'Account 1',
        {
          timeout: 30000,
          description: '"Account 1" in connected accounts summary',
        },
      );
      expect(Assertions.expectTextDisplayed).toHaveBeenNthCalledWith(
        2,
        'Account 2',
        {
          timeout: 30000,
          description: '"Account 2" in connected accounts summary',
        },
      );
      expect(Assertions.expectTextDisplayed).toHaveBeenNthCalledWith(
        3,
        'Account 3',
        {
          timeout: 30000,
          description: '"Account 3" in connected accounts summary',
        },
      );
    });

    it('applies a custom timeout to each account name assertion', async () => {
      await ConnectedAccountsModal.expectConnectedAccountsDisplayed(
        ['Account 2'],
        { timeout: 45000 },
      );

      expect(Assertions.expectTextDisplayed).toHaveBeenCalledWith('Account 2', {
        timeout: 45000,
        description: '"Account 2" in connected accounts summary',
      });
    });
  });

  describe('tapConfirmDisconnectNetworksButton', () => {
    it('taps confirm with disappear wait, then waits for disconnect_all to leave', async () => {
      await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

      const [confirmTarget, confirmOpts] = jest.mocked(Gestures.waitAndTap).mock
        .calls[0];
      await expect(Promise.resolve(confirmTarget)).resolves.toBe(
        confirmDisconnectSentinel,
      );
      expect(confirmOpts).toEqual({
        elemDescription: 'Confirm disconnect networks button',
        waitForElementToDisappear: true,
      });

      const [disconnectTarget, disconnectTimeout] = jest.mocked(
        Utilities.waitForElementToDisappear,
      ).mock.calls[0];
      await expect(Promise.resolve(disconnectTarget)).resolves.toBe(
        disconnectAllSentinel,
      );
      expect(disconnectTimeout).toBe(15_000);
    });
  });
});
