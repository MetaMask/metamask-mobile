/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
import createMockStore from 'redux-mock-store';
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import {
  useAccountSettingsProps,
  useSwitchNotifications,
} from './useSwitchNotifications';
import * as Actions from '../../../actions/notification/pushNotifications';
import initialRootState from '../../test/initial-root-state';
import Engine from '../../../core/Engine';
import * as Selectors from '../../../selectors/pushNotifications';

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  // Ensure dispatch mocks are handled correctly
  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

describe('useSwitchNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeHook = () => {
    const store = arrangeStore();
    const hook = renderHook(() => useSwitchNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  };

  test('should switch feature announcements', async () => {
    const mockSetFeatureAnnouncementEnabled = jest
      .spyOn(Actions, 'setFeatureAnnouncementsEnabled')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchFeatureAnnouncements } = result.current;

    await act(async () => {
      await switchFeatureAnnouncements(true);
    });

    expect(mockSetFeatureAnnouncementEnabled).toHaveBeenCalledWith(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should switch account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = true;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockUpdateOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockDeleteOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should delete account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = false;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockDeleteOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockUpdateOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useAccountSettingsProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeHook(accounts: string[]) {
    const store = arrangeStore();
    const hook = renderHook(() => useAccountSettingsProps(accounts), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  function arrangeEngine() {
    // Mock Properties - used so we can polyfill/mock engine
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockedProperties: any = {};

    jest.replaceProperty(Engine, 'context', {
      NotificationServicesController: {
        ...mockedProperties,
        checkAccountsPresence: jest.fn(),
      },
      ...mockedProperties,
    });

    const mockCheckAccountsPresence = jest
      .spyOn(
        Engine.context.NotificationServicesController,
        'checkAccountsPresence',
      )
      .mockResolvedValue({});
    return {
      mockCheckAccountsPresence,
    };
  }

  function arrangeSelectors() {
    const selectIsUpdatingMetamaskNotificationsAccount = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotificationsAccount')
      .mockReturnValue([]);

    return {
      selectIsUpdatingMetamaskNotificationsAccount,
    };
  }

  test('should fetch initial account settings', async () => {
    const ACCOUNT_1 = 'account1';

    const mockEngine = arrangeEngine();
    mockEngine.mockCheckAccountsPresence.mockResolvedValue({ ACCOUNT_1: true });
    arrangeSelectors();

    const { result, waitForValueToChange } = arrangeHook([ACCOUNT_1]);

    // Initial Effect
    expect(result.current.initialLoading).toBe(true);
    expect(result.current.data).toEqual({});
    await waitForValueToChange(() => result.current.initialLoading);

    // Effect Finished
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.data).toEqual({ ACCOUNT_1: true });
  });

  test('should return accounts update status if an account is being updated', () => {
    const ACCOUNT_1 = 'account1';
    arrangeEngine();
    const mockSelectors = arrangeSelectors();
    mockSelectors.selectIsUpdatingMetamaskNotificationsAccount.mockReturnValue([
      ACCOUNT_1,
    ]);

    const { result } = arrangeHook([]);
    expect(result.current.accountsBeingUpdated.length).toBeGreaterThan(0);
  });

  test('should perform refetch to update account settings', async () => {
    const ACCOUNT_1 = 'account1';

    const mockEngine = arrangeEngine();
    arrangeSelectors();

    const { result, waitForValueToChange } = arrangeHook([]);

    // Wait for initial loading effect to finish (reset mocks)
    await waitForValueToChange(() => result.current.initialLoading === false);
    mockEngine.mockCheckAccountsPresence.mockClear();
    mockEngine.mockCheckAccountsPresence.mockResolvedValueOnce({
      ACCOUNT_1: true,
    });

    // Act, perform refetch/update
    await act(async () => {
      await result.current.update([ACCOUNT_1]);
    });

    expect(mockEngine.mockCheckAccountsPresence).toHaveBeenCalled();
  });
});
