import { renderHook } from '@testing-library/react-hooks';
import useCurrentRouteName from './useActiveRouteName';
import { useRoute } from '@react-navigation/native';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
}));

describe('useActiveRouteName', () => {
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the active route name', () => {
    mockUseRoute.mockReturnValue({ name: 'WalletView', key: 'WalletView' });

    const { result } = renderHook(() => useCurrentRouteName());

    expect(result.current).toBe('WalletView');
  });

  it('should map to correct route name', () => {
    const mappedRouteNames = [
      { from: 'Main', to: 'WalletView' },
      { from: 'WalletTabHome', to: 'WalletView' },
      { from: 'Home', to: 'WalletView' },
      { from: 'TransactionsHome', to: 'TransactionsView' },
    ];

    mappedRouteNames.forEach(({ from, to }) => {
      mockUseRoute.mockReturnValue({ name: from, key: from });

      const { result } = renderHook(() => useCurrentRouteName());

      expect(result.current).toBe(to);
    });
  });
});
