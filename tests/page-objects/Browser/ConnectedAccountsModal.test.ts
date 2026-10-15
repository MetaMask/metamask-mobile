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

import type { AppiumElement } from '../../framework';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import ConnectedAccountsModal from './ConnectedAccountsModal';

const EDIT_ACCOUNTS_ID = 'account-list-bottom-sheet';
const DISCONNECT_ALL_ID = 'disconnect_all';

const editAccountsSentinel = {
  id: EDIT_ACCOUNTS_ID,
} as unknown as AppiumElement;
const disconnectAllSentinel = {
  id: DISCONNECT_ALL_ID,
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
      return Promise.resolve({
        id: String(elementId),
      } as unknown as AppiumElement);
    });
    jest.mocked(Assertions.expectElementToBeVisible).mockResolvedValue();
    jest.mocked(Assertions.expectTextDisplayed).mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});
