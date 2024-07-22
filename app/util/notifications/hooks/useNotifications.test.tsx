/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useListNotifications,
  useCreateNotifications,
  useEnableNotifications,
  useDisableNotifications,
  useMarkNotificationAsRead,
} from './useNotifications';
import { TRIGGER_TYPES } from '../constants';
import createMockStore from 'redux-mock-store';
import initialRootState from '../../../util/test/initial-root-state';
import * as Selectors from '../../../selectors/notifications';
import * as Actions from '../../../actions/notification/helpers';
import { Provider } from 'react-redux';
import {
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
} from '../../../components/UI/Notification/__mocks__/mock_notifications';

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

    expect(mockActions.fetchAndUpdateMetamaskNotifications).toHaveBeenCalled();
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

  it('should create on-chain triggers for notifications', async () => {
    const mockActions = arrangeActions();
    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createNotifications(['Account1', 'Account2']);
    });

    expect(mockActions.updateOnChainTriggersByAccount).toHaveBeenCalled();
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

    expect(mockActions.enableNotificationServices).toHaveBeenCalled();
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

    expect(mockActions.disableNotificationServices).toHaveBeenCalled();
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

  it('should mark specific notifications as read', async () => {
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

    expect(mockActions.markMetamaskNotificationsAsRead).toHaveBeenCalled();
  });
});
