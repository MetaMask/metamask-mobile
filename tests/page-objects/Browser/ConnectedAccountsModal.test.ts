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
    executeWithRetry: jest.fn(async (operation: () => Promise<unknown>) =>
      operation(),
    ),
    isElementVisible: jest.fn(),
    waitForElementToDisappear: jest.fn(),
  },
}));

jest.mock('../../framework/AppiumContextHelpers', () => ({
  __esModule: true,
  default: {
    switchToNativeContext: jest.fn(),
  },
}));

jest.mock('./BrowserView', () => ({
  __esModule: true,
  default: {
    networkAvatarOrAccountButton: Promise.resolve({ id: 'avatar' }),
  },
}));

jest.mock('../wallet/ToastModal', () => ({
  __esModule: true,
  default: {
    waitForToastToDismiss: jest.fn(),
  },
}));

jest.mock('../Network/NetworkListModal', () => ({
  __esModule: true,
  default: {
    selectNetwork: Promise.resolve({ id: 'select-network' }),
    swipeToDismissModal: jest.fn(),
  },
}));

jest.mock('../MMConnect/DappConnectionModal', () => ({
  __esModule: true,
  default: {
    connectButton: Promise.resolve({ id: 'connect-button' }),
  },
}));

import type { AppiumElement } from '../../framework';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import AppiumContextHelpers from '../../framework/AppiumContextHelpers';
import ToastModal from '../wallet/ToastModal';
import NetworkListModal from '../Network/NetworkListModal';
import DappConnectionModal from '../MMConnect/DappConnectionModal';
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

  describe('openFromBrowser', () => {
    beforeEach(() => {
      jest.mocked(Utilities.isElementVisible).mockResolvedValue(false);
      jest.mocked(Utilities.waitForElementToDisappear).mockResolvedValue();
      jest.mocked(ToastModal.waitForToastToDismiss).mockResolvedValue();
      jest.mocked(Gestures.waitAndTap).mockResolvedValue();
      jest
        .mocked(AppiumContextHelpers.switchToNativeContext)
        .mockResolvedValue();
    });

    it('returns immediately when the connected-accounts sheet is already open', async () => {
      jest.mocked(Utilities.isElementVisible).mockResolvedValueOnce(true);

      await ConnectedAccountsModal.openFromBrowser();

      expect(AppiumContextHelpers.switchToNativeContext).toHaveBeenCalled();
      expect(ToastModal.waitForToastToDismiss).toHaveBeenCalled();
      expect(Utilities.waitForElementToDisappear).not.toHaveBeenCalled();
      expect(Gestures.waitAndTap).not.toHaveBeenCalled();
    });

    it('dismisses the network picker then re-taps the browser avatar', async () => {
      jest
        .mocked(Utilities.isElementVisible)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await ConnectedAccountsModal.openFromBrowser();

      expect(NetworkListModal.swipeToDismissModal).toHaveBeenCalled();
      expect(Gestures.waitAndTap).toHaveBeenCalled();
      expect(Assertions.expectElementToBeVisible).toHaveBeenCalledWith(
        ConnectedAccountsModal.accountListBottomSheet,
        expect.objectContaining({
          timeout: 3000,
          description: 'Connected accounts sheet after browser avatar tap',
        }),
      );
    });

    it('waits for the connect sheet to close when requested', async () => {
      jest.mocked(Utilities.isElementVisible).mockResolvedValueOnce(true);

      await ConnectedAccountsModal.openFromBrowser({
        waitForConnectSheetClosed: true,
      });

      expect(Utilities.waitForElementToDisappear).toHaveBeenCalledWith(
        DappConnectionModal.connectButton,
        15_000,
      );
    });
  });
});
