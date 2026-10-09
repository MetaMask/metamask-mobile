import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useHasUnreadNotifications } from './useHasUnreadNotifications';
import {
  getMetamaskNotificationsUnreadCount,
  selectIsMetamaskNotificationsEnabled,
} from '../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../util/notifications';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock('../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

const arrange = ({ enabled = true, unread = 1 } = {}) => {
  jest.mocked(useSelector).mockImplementation((selector: unknown) => {
    if (selector === selectIsMetamaskNotificationsEnabled) return enabled;
    if (selector === getMetamaskNotificationsUnreadCount) return unread;
    return undefined;
  });
};

describe('useHasUnreadNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(true);
  });

  it('is true when the feature is on, notifications are enabled, and unread exist', () => {
    arrange({ enabled: true, unread: 2 });

    const { result } = renderHook(() => useHasUnreadNotifications());

    expect(result.current).toBe(true);
  });

  it('is false when there are no unread notifications', () => {
    arrange({ unread: 0 });

    const { result } = renderHook(() => useHasUnreadNotifications());

    expect(result.current).toBe(false);
  });

  it('is false when the user has notifications turned off', () => {
    arrange({ enabled: false });

    const { result } = renderHook(() => useHasUnreadNotifications());

    expect(result.current).toBe(false);
  });

  it('is false when the notifications feature is disabled', () => {
    jest.mocked(isNotificationsFeatureEnabled).mockReturnValue(false);
    arrange();

    const { result } = renderHook(() => useHasUnreadNotifications());

    expect(result.current).toBe(false);
  });
});
