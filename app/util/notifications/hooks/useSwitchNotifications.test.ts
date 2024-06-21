import { renderHook, act } from '@testing-library/react-hooks';
import { useSwitchNotifications } from '../../../util/notifications/hooks/useSwitchNotifications';
import {
  setSnapNotificationsEnabled,
  setFeatureAnnouncementsEnabled,
  updateOnChainTriggersByAccount,
  deleteOnChainTriggersByAccount,
} from '../../../actions/notification/pushNotifications';

jest.mock('../../../actions/notification/pushNotifications');

describe('useSwitchNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should switch snap notifications', async () => {
    const { result } = renderHook(() => useSwitchNotifications());
    const { switchSnapNotifications } = result.current;

    await act(async () => {
      await switchSnapNotifications(true);
    });

    expect(setSnapNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('should switch feature announcements', async () => {
    const { result } = renderHook(() => useSwitchNotifications());
    const { switchFeatureAnnouncements } = result.current;

    await act(async () => {
      await switchFeatureAnnouncements(true);
    });

    expect(setFeatureAnnouncementsEnabled).toHaveBeenCalledWith(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('should switch account notifications', async () => {
    const { result } = renderHook(() => useSwitchNotifications());
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = true;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(updateOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(deleteOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('should delete account notifications', async () => {
    const { result } = renderHook(() => useSwitchNotifications());
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = false;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(deleteOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(updateOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});
