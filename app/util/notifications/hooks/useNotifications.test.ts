import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';

// ...

const useDispatchMock = useDispatch as jest.Mock<AppDispatch>;
import {
  fetchAndUpdateMetamaskNotificationsRequest,
  markMetamaskNotificationsAsReadRequest,
  setMetamaskNotificationsFeatureSeenRequest,
  updateOnChainTriggersByAccountRequest,
  disableNotificationsServicesRequest,
  enableNotificationsServicesRequest,
} from '../../../actions/notification/pushNotifications';

import {
  useListNotifications,
  useCreateNotifications,
  useEnableNotifications,
  useDisableNotifications,
  useMarkNotificationAsRead,
} from './useNotifications';
import { AppDispatch } from '../../../store';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../actions/notification/pushNotifications', () => ({
  fetchAndUpdateMetamaskNotificationsRequest: jest.fn(),
  markMetamaskNotificationsAsReadRequest: jest.fn(),
  setMetamaskNotificationsFeatureSeenRequest: jest.fn(),
  updateOnChainTriggersByAccountRequest: jest.fn(),
  disableNotificationsServicesRequest: jest.fn(),
  enableNotificationsServicesRequest: jest.fn(),
}));

jest.mock('../../../selectors/pushNotifications', () => ({
  selectNotificationsList: jest.fn(),
  selectIsMetamaskNotificationsEnabled: jest.fn(),
}));

describe('useListNotifications', () => {
  const dispatch = jest.fn();
  const notifications = [{ id: 1, message: 'Notification 1' }];
  const selectNotificationsListMock = useSelector as jest.Mock;
  const fetchAndUpdateMetamaskNotificationsRequestMock =
    fetchAndUpdateMetamaskNotificationsRequest as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    selectNotificationsListMock.mockReturnValue(notifications);
    fetchAndUpdateMetamaskNotificationsRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the list of notifications and loading state', () => {
    const { result } = renderHook(() => useListNotifications());

    expect(result.current.notificationsData).toEqual(notifications);
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch and update the list of notifications', async () => {
    const { result } = renderHook(() => useListNotifications());

    await act(async () => {
      result.current.listNotifications();
    });

    expect(dispatch).toHaveBeenCalledWith(
      fetchAndUpdateMetamaskNotificationsRequest(),
    );
    expect(result.current.notificationsData).toEqual(notifications);
    expect(result.current.isLoading).toBe(false);
  });

  it('should set loading state to true while fetching notifications', async () => {
    const { result } = renderHook(() => useListNotifications());

    await act(async () => {
      result.current.listNotifications();
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should set loading state to false after fetching notifications', async () => {
    const { result } = renderHook(() => useListNotifications());

    await act(async () => {
      result.current.listNotifications();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set error state if an error occurs while fetching notifications', async () => {
    const errorMessage = 'Failed to fetch notifications';
    fetchAndUpdateMetamaskNotificationsRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useListNotifications());

    await act(async () => {
      try {
        await result.current.listNotifications();
      } catch (e) {
        // Error is thrown and caught
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useCreateNotifications', () => {
  const dispatch = jest.fn();
  const updateOnChainTriggersByAccountRequestMock =
    updateOnChainTriggersByAccountRequest as jest.Mock;
  const setMetamaskNotificationsFeatureSeenRequestMock =
    setMetamaskNotificationsFeatureSeenRequest as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    updateOnChainTriggersByAccountRequestMock.mockReturnValue(
      Promise.resolve(),
    );
    setMetamaskNotificationsFeatureSeenRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enable notifications and set feature seen', async () => {
    const { result } = renderHook(() => useCreateNotifications());
    const accounts = ['account1', 'account2'];

    await act(async () => {
      result.current.createNotifications(accounts);
    });

    expect(dispatch).toHaveBeenCalledWith(
      updateOnChainTriggersByAccountRequest(accounts),
    );
    expect(dispatch).toHaveBeenCalledWith(
      setMetamaskNotificationsFeatureSeenRequest(),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('should set loading state to true while enabling notifications', async () => {
    const { result } = renderHook(() => useCreateNotifications());
    const accounts = ['account1', 'account2'];

    await act(async () => {
      result.current.createNotifications(accounts);
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set loading state to false after enabling notifications', async () => {
    const { result } = renderHook(() => useCreateNotifications());
    const accounts = ['account1', 'account2'];

    await act(async () => {
      result.current.createNotifications(accounts);
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set error state if an error occurs while enabling notifications', async () => {
    const errorMessage = 'Failed to enable notifications';
    updateOnChainTriggersByAccountRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useCreateNotifications());
    const accounts = ['account1', 'account2'];

    await act(async () => {
      try {
        await result.current.createNotifications(accounts);
      } catch (e) {
        // Error is thrown and caught
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useEnableNotifications', () => {
  const dispatch = jest.fn();
  const enableNotificationsServicesRequestMock =
    enableNotificationsServicesRequest as jest.Mock;
  const setMetamaskNotificationsFeatureSeenRequestMock =
    setMetamaskNotificationsFeatureSeenRequest as jest.Mock;
  const selectIsMetamaskNotificationsEnabledMock = useSelector as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    enableNotificationsServicesRequestMock.mockReturnValue(Promise.resolve());
    setMetamaskNotificationsFeatureSeenRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enable MetaMask notifications and set feature seen', async () => {
    const { result } = renderHook(() => useEnableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(false);

    await act(async () => {
      result.current.enableNotifications();
    });

    expect(dispatch).toHaveBeenCalledWith(enableNotificationsServicesRequest());
    expect(dispatch).toHaveBeenCalledWith(
      setMetamaskNotificationsFeatureSeenRequest(),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('should return the current state of MetaMask notifications', async () => {
    const { result } = renderHook(() => useEnableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(true);

    await act(async () => {
      const isEnabled = result.current.enableNotifications();
      expect(isEnabled).toBe(true);
    });
  });

  it('should set loading state to true while enabling MetaMask notifications', async () => {
    const { result } = renderHook(() => useEnableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(false);

    await act(async () => {
      result.current.enableNotifications();
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set loading state to false after enabling MetaMask notifications', async () => {
    const { result } = renderHook(() => useEnableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(false);

    await act(async () => {
      result.current.enableNotifications();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set error state if an error occurs while enabling MetaMask notifications', async () => {
    const errorMessage = 'Failed to enable MetaMask notifications';
    enableNotificationsServicesRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useEnableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(false);

    await act(async () => {
      try {
        await result.current.enableNotifications();
      } catch (e) {
        // Error is thrown and caught
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useDisableNotifications', () => {
  const dispatch = jest.fn();
  const disableNotificationsServicesRequestMock =
    disableNotificationsServicesRequest as jest.Mock;
  const selectIsMetamaskNotificationsEnabledMock = useSelector as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    disableNotificationsServicesRequestMock.mockReturnValue(Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should disable notifications', async () => {
    const { result } = renderHook(() => useDisableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(true);

    await act(async () => {
      result.current.disableNotifications();
    });

    expect(dispatch).toHaveBeenCalledWith(
      disableNotificationsServicesRequest(),
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('should return the current state of MetaMask notifications', async () => {
    const { result } = renderHook(() => useDisableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(false);

    await act(async () => {
      const isEnabled = result.current.disableNotifications();
      expect(isEnabled).toBe(false);
    });
  });

  it('should set loading state to true while disabling notifications', async () => {
    const { result } = renderHook(() => useDisableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(true);

    await act(async () => {
      result.current.disableNotifications();
    });

    expect(result.current.loading).toBe(true);
  });

  it('should set loading state to false after disabling notifications', async () => {
    const { result } = renderHook(() => useDisableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(true);

    await act(async () => {
      result.current.disableNotifications();
    });

    expect(result.current.loading).toBe(false);
  });

  it('should set error state if an error occurs while disabling notifications', async () => {
    const errorMessage = 'Failed to disable notifications';
    disableNotificationsServicesRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useDisableNotifications());
    selectIsMetamaskNotificationsEnabledMock.mockReturnValue(true);

    await act(async () => {
      try {
        await result.current.disableNotifications();
      } catch (e) {
        // Error is thrown and caught
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useMarkNotificationAsRead', () => {
  const dispatch = jest.fn();
  const markMetamaskNotificationsAsReadRequestMock =
    markMetamaskNotificationsAsReadRequest as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    markMetamaskNotificationsAsReadRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should mark notifications as read', async () => {
    const { result } = renderHook(() => useMarkNotificationAsRead());
    const notifications = [
      { id: 1, message: 'Notification 1' },
      { id: 2, message: 'Notification 2' },
    ];

    await act(async () => {
      result.current.markNotificationAsRead(notifications);
    });

    expect(dispatch).toHaveBeenCalledWith(
      markMetamaskNotificationsAsReadRequest(notifications),
    );
    expect(result.current.error).toBeUndefined();
  });

  it('should set error state if an error occurs while marking notifications as read', async () => {
    const errorMessage = 'Failed to mark notifications as read';
    markMetamaskNotificationsAsReadRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useMarkNotificationAsRead());
    const notifications = [
      { id: 1, message: 'Notification 1' },
      { id: 2, message: 'Notification 2' },
    ];

    await act(async () => {
      try {
        await result.current.markNotificationAsRead(notifications);
      } catch (e) {
        // Error is thrown and caught
      }
    });

    expect(result.current.error).toBe(errorMessage);
  });
});
