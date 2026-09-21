jest.mock('../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
  },
}));

jest.mock('../framework/Gestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn(),
  },
}));

jest.mock('../framework/Utilities', () => ({
  __esModule: true,
  default: {
    executeWithRetry: jest.fn(),
    isElementVisible: jest.fn(),
    waitForElementToDisappear: jest.fn(),
  },
}));

jest.mock('../framework/AppiumContextHelpers', () => ({
  __esModule: true,
  default: {
    switchToNativeContext: jest.fn(),
  },
}));

jest.mock('../page-objects/Browser/BrowserView', () => ({
  __esModule: true,
  default: {
    networkAvatarOrAccountButton: 'browser-account-button',
  },
}));

jest.mock('../page-objects/Browser/ConnectedAccountsModal', () => ({
  __esModule: true,
  default: {
    accountListBottomSheet: 'connected-accounts-sheet',
  },
}));

jest.mock('../page-objects/MMConnect/DappConnectionModal', () => ({
  __esModule: true,
  default: {
    connectButton: 'connect-button',
  },
}));

jest.mock('../page-objects/Network/NetworkListModal', () => ({
  __esModule: true,
  default: {
    selectNetwork: 'network-selector',
    swipeToDismissModal: jest.fn(),
  },
}));

jest.mock('../page-objects/wallet/ToastModal', () => ({
  __esModule: true,
  default: {
    waitForToastToDismiss: jest.fn(),
  },
}));

import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Utilities from '../framework/Utilities';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import ToastModal from '../page-objects/wallet/ToastModal';
import { openConnectedAccounts } from './connected-accounts.flow';

const mockWaitAndTap = jest.mocked(Gestures.waitAndTap);
const mockExpectVisible = jest.mocked(Assertions.expectElementToBeVisible);
const mockWaitForElementToDisappear = jest.mocked(
  Utilities.waitForElementToDisappear,
);
const mockIsElementVisible = jest.mocked(Utilities.isElementVisible);
const mockExecuteWithRetry = jest.mocked(Utilities.executeWithRetry);
const mockSwipeToDismissModal = jest.mocked(
  NetworkListModal.swipeToDismissModal,
);
const mockWaitForToastToDismiss = jest.mocked(ToastModal.waitForToastToDismiss);

describe('openConnectedAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteWithRetry.mockImplementation(
      async (operation: () => Promise<unknown>) => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError;
      },
    );
  });

  it('waits for a connection modal and toast before using an open sheet', async () => {
    mockIsElementVisible.mockResolvedValueOnce(true);

    await openConnectedAccounts({ waitForConnectionModalToClose: true });

    expect(mockWaitForElementToDisappear).toHaveBeenCalledWith(
      'connect-button',
      15_000,
    );
    expect(mockWaitForToastToDismiss).toHaveBeenCalled();
    expect(mockWaitAndTap).not.toHaveBeenCalled();
  });

  it('dismisses a transient network selector before retrying the account button', async () => {
    mockIsElementVisible
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await openConnectedAccounts();

    expect(mockSwipeToDismissModal).toHaveBeenCalled();
    expect(mockWaitAndTap).toHaveBeenCalledWith('browser-account-button', {
      elemDescription: 'Network avatar or account button',
      timeout: 3_000,
    });
    expect(mockExpectVisible).toHaveBeenCalledWith(
      'connected-accounts-sheet',
      expect.objectContaining({ timeout: 3_000 }),
    );
  });
});
