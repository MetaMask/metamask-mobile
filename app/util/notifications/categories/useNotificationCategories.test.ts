import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useNotificationCategories } from './useNotificationCategories';
import { fetchNotificationCategories } from './notification-categories-api';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('./notification-categories-api', () => ({
  fetchNotificationCategories: jest.fn(),
}));

describe('useNotificationCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty list and isLoading while the query is pending', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useNotificationCategories());

    expect(result.current).toEqual({ categories: [], isLoading: true });
  });

  it('returns the resolved catalog once loaded', () => {
    const categories = [
      {
        categoryId: 'walletActivity',
        ausKeys: ['walletActivity'],
        label: 'Wallet activity',
        description: '',
        icon: 'Clock',
      },
    ];
    (useQuery as jest.Mock).mockReturnValue({
      data: categories,
      isLoading: false,
    });

    const { result } = renderHook(() => useNotificationCategories());

    expect(result.current).toEqual({ categories, isLoading: false });
  });

  it('builds the query with fetchNotificationCategories as the query function', () => {
    (useQuery as jest.Mock).mockImplementation(({ queryFn }) => {
      queryFn();
      return { data: undefined, isLoading: true };
    });

    renderHook(() => useNotificationCategories());

    expect(fetchNotificationCategories).toHaveBeenCalledWith(
      expect.any(String),
    );
  });
});
