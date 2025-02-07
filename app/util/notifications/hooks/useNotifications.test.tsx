/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';

import {
  useListNotifications,
  useCreateNotifications,
  useEnableNotifications,
  useDisableNotifications,
  useMarkNotificationAsRead,
  useDeleteNotificationsStorageKey,
} from './useNotifications';
import createMockStore from 'redux-mock-store';
import initialRootState from '../../../util/test/initial-root-state';
import * as Selectors from '../../../selectors/notifications';
import * as Actions from '../../../actions/notification/helpers';
import { Provider } from 'react-redux';
import {
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
} from '../../../components/UI/Notification/__mocks__/mock_notifications';

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  isNotificationsFeatureEnabled: () => true,
}));

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

describe('useListNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeSelectors() {
    const getNotificationsList = jest
      .spyOn(Selectors, 'getNotificationsList')
      .mockReturnValue([]);
    return {
      getNotificationsList,
    };
  }

  function arrangeActions() {
    const fetchAndUpdateMetamaskNotifications = jest
      .spyOn(Actions, 'fetchAndUpdateMetamaskNotifications')
      .mockResolvedValue(undefined);

    return {
      fetchAndUpdateMetamaskNotifications,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useListNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('should fetch and update the list of notifications', async () => {
    const mockSelectors = arrangeSelectors();
    mockSelectors.getNotificationsList.mockReturnValue([
      createMockNotificationEthSent(),
      createMockNotificationEthReceived(),
    ]);

    const mockActions = arrangeActions();

    const { result } = arrangeHook();

    // Assert - initial state
    expect(result.current.notificationsData.length).toBe(2);

    // Act - test re-fetching list
    await act(async () => {
      await result.current.listNotifications();
    });

    expect(
      mockActions.fetchAndUpdateMetamaskNotifications,
    ).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeActions() {
    const updateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockResolvedValue(undefined);

    return {
      updateOnChainTriggersByAccount,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useCreateNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('creates on-chain triggers for notifications', async () => {
    const mockActions = arrangeActions();
    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createNotifications(['Account1', 'Account2']);
    });

    expect(mockActions.updateOnChainTriggersByAccount).toHaveBeenCalledTimes(1);
    expect(mockActions.updateOnChainTriggersByAccount).toHaveBeenCalledWith([
      'Account1',
      'Account2',
    ]);
  });
});

describe('useEnableNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeSelectors() {
    const selectIsMetamaskNotificationsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(true);
    return {
      selectIsMetamaskNotificationsEnabled,
    };
  }

  function arrangeActions() {
    const enableNotificationServices = jest
      .spyOn(Actions, 'enableNotificationServices')
      .mockResolvedValue(undefined);

    return {
      enableNotificationServices,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useEnableNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('enables notifications', async () => {
    arrangeSelectors();
    const mockActions = arrangeActions();
    const { result } = arrangeHook();

    await act(async () => {
      await result.current.enableNotifications();
    });

    expect(mockActions.enableNotificationServices).toHaveBeenCalledTimes(1);
  });
});

describe('useDisableNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeSelectors() {
    const selectIsMetamaskNotificationsEnabled = jest
      .spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
      .mockReturnValue(true);
    return {
      selectIsMetamaskNotificationsEnabled,
    };
  }

  function arrangeActions() {
    const disableNotificationServices = jest
      .spyOn(Actions, 'disableNotificationServices')
      .mockResolvedValue(undefined);

    return {
      disableNotificationServices,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useDisableNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('disables notifications', async () => {
    arrangeSelectors();
    const mockActions = arrangeActions();
    const { result } = arrangeHook();

    await act(async () => {
      await result.current.disableNotifications();
    });

    expect(mockActions.disableNotificationServices).toHaveBeenCalledTimes(1);
  });
});

describe('useMarkNotificationAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeActions() {
    const markMetamaskNotificationsAsRead = jest
      .spyOn(Actions, 'markMetamaskNotificationsAsRead')
      .mockResolvedValue(undefined);

    return {
      markMetamaskNotificationsAsRead,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useMarkNotificationAsRead(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('marks specific notifications as read', async () => {
    const mockActions = arrangeActions();
    const { result } = arrangeHook();

    await act(async () => {
      await result.current.markNotificationAsRead([
        {
          id: '1',
          isRead: true,
          type: TRIGGER_TYPES.ETH_SENT,
        },
      ]);
    });

    expect(mockActions.markMetamaskNotificationsAsRead).toHaveBeenCalledTimes(
      1,
    );
    expect(mockActions.markMetamaskNotificationsAsRead).toHaveBeenCalledWith([
      { id: '1', isRead: true, type: 'eth_sent' },
    ]);
  });
});

describe('useDeleteNotificationsStorageKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeActions() {
    const deleteNotificationsStorageKey = jest
      .spyOn(Actions, 'performDeleteStorage')
      .mockResolvedValue(undefined);

    return {
      deleteNotificationsStorageKey,
    };
  }

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useDeleteNotificationsStorageKey(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('deletes notifications storage key', async () => {
    const mockActions = arrangeActions();
    const { result } = arrangeHook();

    await act(async () => {
      await result.current.deleteNotificationsStorageKey();
    });

    expect(mockActions.deleteNotificationsStorageKey).toHaveBeenCalledTimes(1);
  });
});
