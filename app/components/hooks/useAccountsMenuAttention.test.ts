import { renderHook } from '@testing-library/react-native';
import { useAccountsMenuAttention } from './useAccountsMenuAttention';
import { useHasUnreadNotifications } from './useHasUnreadNotifications';
import { useCardUkMigrationUpdateBadge } from '../UI/Card/hooks/useCardUkMigrationUpdateBadge';

jest.mock('./useHasUnreadNotifications', () => ({
  useHasUnreadNotifications: jest.fn(() => false),
}));

jest.mock('../UI/Card/hooks/useCardUkMigrationUpdateBadge', () => ({
  useCardUkMigrationUpdateBadge: jest.fn(() => null),
}));

describe('useAccountsMenuAttention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useHasUnreadNotifications).mockReturnValue(false);
    jest.mocked(useCardUkMigrationUpdateBadge).mockReturnValue(null);
  });

  it('is false when neither unread notifications nor the Card update badge are present', () => {
    const { result } = renderHook(() => useAccountsMenuAttention());

    expect(result.current).toBe(false);
  });

  it('is true when there are unread notifications', () => {
    jest.mocked(useHasUnreadNotifications).mockReturnValue(true);

    const { result } = renderHook(() => useAccountsMenuAttention());

    expect(result.current).toBe(true);
  });

  it('is true when the Card UK migration Update badge is visible', () => {
    jest.mocked(useCardUkMigrationUpdateBadge).mockReturnValue('warning');

    const { result } = renderHook(() => useAccountsMenuAttention());

    expect(result.current).toBe(true);
  });

  it('is true when unread notifications and the Card Update badge are both present', () => {
    jest.mocked(useHasUnreadNotifications).mockReturnValue(true);
    jest.mocked(useCardUkMigrationUpdateBadge).mockReturnValue('info');

    const { result } = renderHook(() => useAccountsMenuAttention());

    expect(result.current).toBe(true);
  });
});
