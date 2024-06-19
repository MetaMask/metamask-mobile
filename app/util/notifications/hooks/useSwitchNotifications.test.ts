import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import {
  setSnapNotificationsEnabledRequest,
  setFeatureAnnouncementsEnabledRequest,
  enablePushNotificationsRequest,
  disablePushNotificationsRequest,
  checkAccountsPresenceRequest,
  updateOnChainTriggersByAccountRequest,
  deleteOnChainTriggersByAccountRequest,
} from '../../../actions/notification/pushNotifications';
import {
  useSwitchSnapNotificationsChange,
  useSwitchFeatureAnnouncementsChange,
  useSwitchPushNotificationsChange,
  useSwitchAccountNotifications,
  useSwitchAccountNotificationsChange,
} from './useSwitchNotifications';
import { AppDispatch } from '../../../store';

const useDispatchMock = useDispatch as jest.Mock<AppDispatch>;

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../../actions/notification/pushNotifications', () => ({
  setSnapNotificationsEnabledRequest: jest.fn(),
  setFeatureAnnouncementsEnabledRequest: jest.fn(),
  enablePushNotificationsRequest: jest.fn(),
  disablePushNotificationsRequest: jest.fn(),
  checkAccountsPresenceRequest: jest.fn(),
  updateOnChainTriggersByAccountRequest: jest.fn(),
  deleteOnChainTriggersByAccountRequest: jest.fn(),
}));

describe('useSwitchSnapNotificationsChange', () => {
  const dispatch = jest.fn();
  const setSnapNotificationsEnabledRequestMock =
    setSnapNotificationsEnabledRequest as jest.Mock;
  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    setSnapNotificationsEnabledRequestMock.mockReturnValue(Promise.resolve());
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should set snap notifications enabled', async () => {
    const { result } = renderHook(() => useSwitchSnapNotificationsChange());
    await act(async () => {
      result.current.onChange(true);
    });
    expect(dispatch).toHaveBeenCalledWith(setSnapNotificationsEnabledRequest());
    expect(result.current.error).toBeUndefined();
  });
  it('should set error state if an error occurs while setting snap notifications enabled', async () => {
    const errorMessage = 'Failed to set snap notifications enabled';
    setSnapNotificationsEnabledRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchSnapNotificationsChange());
    await act(async () => {
      result.current.onChange(true);
    });
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useSwitchFeatureAnnouncementsChange', () => {
  const dispatch = jest.fn();
  const setFeatureAnnouncementsEnabledRequestMock =
    setFeatureAnnouncementsEnabledRequest as jest.Mock;
  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    setFeatureAnnouncementsEnabledRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should set feature announcements enabled', async () => {
    const { result } = renderHook(() => useSwitchFeatureAnnouncementsChange());
    await act(async () => {
      result.current.onChange(true);
    });
    expect(dispatch).toHaveBeenCalledWith(
      setFeatureAnnouncementsEnabledRequest(),
    );
    expect(result.current.error).toBeUndefined();
  });
  it('should set error state if an error occurs while setting feature announcements enabled', async () => {
    const errorMessage = 'Failed to set feature announcements enabled';
    setFeatureAnnouncementsEnabledRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchFeatureAnnouncementsChange());
    await act(async () => {
      result.current.onChange(true);
    });
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useSwitchPushNotificationsChange', () => {
  const dispatch = jest.fn();
  const enablePushNotificationsRequestMock =
    enablePushNotificationsRequest as jest.Mock;
  const disablePushNotificationsRequestMock =
    disablePushNotificationsRequest as jest.Mock;
  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    enablePushNotificationsRequestMock.mockReturnValue(Promise.resolve());
    disablePushNotificationsRequestMock.mockReturnValue(Promise.resolve());
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should enable push notifications', async () => {
    const { result } = renderHook(() => useSwitchPushNotificationsChange());
    await act(async () => {
      result.current.onChange(['UUID1', 'UUID2'], true);
    });
    expect(dispatch).toHaveBeenCalledWith(
      enablePushNotificationsRequest(['UUID1', 'UUID2']),
    );
    expect(result.current.error).toBeUndefined();
  });
  it('should disable push notifications', async () => {
    const { result } = renderHook(() => useSwitchPushNotificationsChange());
    await act(async () => {
      result.current.onChange(['UUID1', 'UUID2'], false);
    });
    expect(dispatch).toHaveBeenCalledWith(
      disablePushNotificationsRequest(['UUID1', 'UUID2']),
    );
    expect(result.current.error).toBeUndefined();
  });
  it('should set error state if an error occurs while enabling push notifications', async () => {
    const errorMessage = 'Failed to enable push notifications';
    enablePushNotificationsRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchPushNotificationsChange());
    await act(async () => {
      result.current.onChange(['UUID1', 'UUID2'], true);
    });
    expect(result.current.error).toBe(errorMessage);
  });
  it('should set error state if an error occurs while disabling push notifications', async () => {
    const errorMessage = 'Failed to disable push notifications';
    disablePushNotificationsRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchPushNotificationsChange());
    await act(async () => {
      result.current.onChange(['UUID1', 'UUID2'], false);
    });
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useSwitchAccountNotifications', () => {
  const dispatch = jest.fn();
  const checkAccountsPresenceRequestMock =
    checkAccountsPresenceRequest as jest.Mock;
  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    checkAccountsPresenceRequestMock.mockReturnValue(Promise.resolve());
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should switch account notifications', async () => {
    const { result } = renderHook(() => useSwitchAccountNotifications());
    await act(async () => {
      result.current.switchAccountNotifications(['account1', 'account2']);
    });
    expect(dispatch).toHaveBeenCalledWith(
      checkAccountsPresenceRequest(['account1', 'account2']),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
  it('should set loading state to true while switching account notifications', async () => {
    const { result } = renderHook(() => useSwitchAccountNotifications());
    await act(async () => {
      result.current.switchAccountNotifications(['account1', 'account2']);
    });
    expect(result.current.isLoading).toBe(true);
  });
  it('should set loading state to false after switching account notifications', async () => {
    const { result } = renderHook(() => useSwitchAccountNotifications());
    await act(async () => {
      result.current.switchAccountNotifications(['account1', 'account2']);
    });
    expect(result.current.isLoading).toBe(false);
  });
  it('should set error state if an error occurs while switching account notifications', async () => {
    const errorMessage = 'Failed to switch account notifications';
    checkAccountsPresenceRequestMock.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useSwitchAccountNotifications());
    await act(async () => {
      result.current.switchAccountNotifications(['account1', 'account2']);
    });
    expect(result.current.error).toBe(errorMessage);
  });
});

describe('useSwitchAccountNotificationsChange', () => {
  const dispatch = jest.fn();
  const updateOnChainTriggersByAccountRequestMock =
    updateOnChainTriggersByAccountRequest as jest.Mock;
  const deleteOnChainTriggersByAccountRequestMock =
    deleteOnChainTriggersByAccountRequest as jest.Mock;
  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    updateOnChainTriggersByAccountRequestMock.mockReturnValue(
      Promise.resolve(),
    );
    deleteOnChainTriggersByAccountRequestMock.mockReturnValue(
      Promise.resolve(),
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should update on-chain triggers by account', async () => {
    const { result } = renderHook(() => useSwitchAccountNotificationsChange());
    await act(async () => {
      result.current.onChange(['account1', 'account2'], true);
    });
    expect(dispatch).toHaveBeenCalledWith(
      updateOnChainTriggersByAccountRequest(['account1', 'account2']),
    );
    expect(result.current.error).toBeUndefined();
  });
  it('should delete on-chain triggers by account', async () => {
    const { result } = renderHook(() => useSwitchAccountNotificationsChange());
    await act(async () => {
      result.current.onChange(['account1', 'account2'], false);
    });
    expect(dispatch).toHaveBeenCalledWith(
      deleteOnChainTriggersByAccountRequest(['account1', 'account2']),
    );
    expect(result.current.error).toBeUndefined();
  });
  it('should set error state if an error occurs while updating on-chain triggers by account', async () => {
    const errorMessage = 'Failed to update on-chain triggers by account';
    updateOnChainTriggersByAccountRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchAccountNotificationsChange());
    await act(async () => {
      result.current.onChange(['account1', 'account2'], true);
    });
    expect(result.current.error).toBe(errorMessage);
  });
  it('should set error state if an error occurs while deleting on-chain triggers by account', async () => {
    const errorMessage = 'Failed to delete on-chain triggers by account';
    deleteOnChainTriggersByAccountRequestMock.mockRejectedValue(
      new Error(errorMessage),
    );
    const { result } = renderHook(() => useSwitchAccountNotificationsChange());
    await act(async () => {
      result.current.onChange(['account1', 'account2'], false);
    });
    expect(result.current.error).toBe(errorMessage);
  });
});
