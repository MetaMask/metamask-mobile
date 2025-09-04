import { useIsOnBridgeRoute, getAllRouteValues } from './index';
import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useNavigationState } from '@react-navigation/native';

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigationState: jest.fn(),
}));

describe('useIsOnBridgeRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when on bridge route', () => {
    it('returns true when Bridge route exists in navigation state', () => {
      // Arrange
      const mockRoutes = [
        {
          key: 'Home-9NOu_9efT-CiAybmeo-xr',
          name: 'Home',
          params: undefined,
        },
        {
          key: 'Bridge-xUs6x1SwiSwMIXmfoKejK',
          name: 'Bridge',
          params: {
            sourcePage: 'MainView',
            token: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: '0xa4b1',
              decimals: 18,
              image: '',
              name: 'Ether',
              symbol: 'ETH',
            },
            screen: 'BridgeView',
          },
        },
        {
          key: 'BridgeModals-AE5Kmve-nkUf4tfhh4seK',
          name: 'BridgeModals',
          params: {
            screen: 'BridgeSourceTokenSelector',
          },
        },
      ];

      (useNavigationState as jest.Mock).mockReturnValue(mockRoutes);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('when not on bridge route', () => {
    it('returns false when no Bridge route exists', () => {
      // Arrange
      const mockRoutes = [
        {
          key: 'Home-9NOu_9efT-CiAybmeo-xr',
          name: 'Home',
          params: undefined,
        },
        {
          key: 'Settings-abc123',
          name: 'SettingsView',
          params: {},
        },
      ];

      (useNavigationState as jest.Mock).mockReturnValue(mockRoutes);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when routes array is empty', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue([]);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when routes array is undefined', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue(undefined);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when state is undefined', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue(undefined);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is empty', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue([]);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when route name is case-sensitive mismatch', () => {
      // Arrange
      const mockRoutes = [
        {
          key: 'bridge-123',
          name: 'bridge', // lowercase, should not match
          params: {},
        },
        {
          key: 'BRIDGE-456',
          name: 'BRIDGE', // uppercase, should not match
          params: {},
        },
      ];

      (useNavigationState as jest.Mock).mockReturnValue(mockRoutes);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('handles route objects without name property gracefully', () => {
      // Arrange
      const mockRoutes = [
        {
          key: 'route-without-name',
          // name property is missing
          params: {},
        },
        {
          key: 'Bridge-123',
          name: Routes.BRIDGE.ROOT,
          params: {},
        },
      ];

      (useNavigationState as jest.Mock).mockReturnValue(mockRoutes);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(true);
    });

    it('handles route objects with null name property', () => {
      // Arrange
      const mockRoutes = [
        {
          key: 'route-with-null-name',
          name: null,
          params: {},
        },
        {
          key: 'Bridge-123',
          name: Routes.BRIDGE.ROOT,
          params: {},
        },
      ];

      (useNavigationState as jest.Mock).mockReturnValue(mockRoutes);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(true);
    });
  });

  describe('navigation state structure variations', () => {
    it('returns false when routes[0] is undefined', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue(undefined);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is null', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue(null);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is undefined', () => {
      // Arrange
      (useNavigationState as jest.Mock).mockReturnValue(undefined);

      // Act
      const { result } = renderHookWithProvider(() => useIsOnBridgeRoute());

      // Assert
      expect(result.current).toBe(false);
    });
  });
});

describe('getAllRouteValues', () => {
  describe('basic functionality', () => {
    it('extracts string values from flat object', () => {
      // Arrange
      const routeObject = {
        ROOT: 'Bridge',
        DETAILS: 'BridgeTransactionDetails',
      };

      // Act
      const result = getAllRouteValues(routeObject);

      // Assert
      expect(result).toEqual(['Bridge', 'BridgeTransactionDetails']);
    });

    it('extracts string values from nested object', () => {
      // Arrange
      const routeObject = {
        ROOT: 'Bridge',
        MODALS: {
          SOURCE_TOKEN: 'BridgeSourceTokenSelector',
          DEST_TOKEN: 'BridgeDestTokenSelector',
        },
      };

      // Act
      const result = getAllRouteValues(routeObject);

      // Assert
      expect(result).toEqual([
        'Bridge',
        'BridgeSourceTokenSelector',
        'BridgeDestTokenSelector',
      ]);
    });

    it('extracts string values from deeply nested object', () => {
      // Arrange
      const routeObject = {
        ROOT: 'Bridge',
        NESTED: {
          LEVEL_2: {
            LEVEL_3: {
              DEEP_ROUTE: 'VeryDeepRoute',
            },
            ANOTHER_ROUTE: 'AnotherRoute',
          },
          MODAL: 'ModalRoute',
        },
      };

      // Act
      const result = getAllRouteValues(routeObject);

      // Assert
      expect(result).toEqual([
        'Bridge',
        'VeryDeepRoute',
        'AnotherRoute',
        'ModalRoute',
      ]);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty object', () => {
      // Arrange
      const routeObject = {};

      // Act
      const result = getAllRouteValues(routeObject);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
