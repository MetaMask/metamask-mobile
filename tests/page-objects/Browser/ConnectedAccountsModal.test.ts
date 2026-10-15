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

import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import ConnectedAccountsModal from './ConnectedAccountsModal';

const EDIT_ACCOUNTS_ID = 'account-list-bottom-sheet';
const DISCONNECT_ALL_ID = 'disconnect_all';

const editAccountsSentinel = { id: EDIT_ACCOUNTS_ID };
const disconnectAllSentinel = { id: DISCONNECT_ALL_ID };

describe('ConnectedAccountsModal account summary', () => {
  beforeEach(() => {
    jest.mocked(Matchers.getElementByID).mockImplementation((id: string) => {
      if (id === EDIT_ACCOUNTS_ID) {
        return editAccountsSentinel;
      }
      if (id === DISCONNECT_ALL_ID) {
        return disconnectAllSentinel;
      }
      return { id };
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

      expect(Assertions.expectElementToBeVisible).toHaveBeenNthCalledWith(
        1,
        editAccountsSentinel,
        {
          timeout: 20000,
          description: 'Edit accounts control on the connected accounts sheet',
        },
      );
      expect(Assertions.expectElementToBeVisible).toHaveBeenNthCalledWith(
        2,
        disconnectAllSentinel,
        {
          timeout: 20000,
          description: 'Disconnect all accounts and networks control',
        },
      );
    });

    it('passes a custom timeout to both visibility checks', async () => {
      await ConnectedAccountsModal.waitForAccountsSummaryReady(5000);

      expect(Assertions.expectElementToBeVisible).toHaveBeenNthCalledWith(
        1,
        editAccountsSentinel,
        expect.objectContaining({ timeout: 5000 }),
      );
      expect(Assertions.expectElementToBeVisible).toHaveBeenNthCalledWith(
        2,
        disconnectAllSentinel,
        expect.objectContaining({ timeout: 5000 }),
      );
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
