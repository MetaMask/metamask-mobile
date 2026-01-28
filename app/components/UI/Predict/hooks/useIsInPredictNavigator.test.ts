import {
  useIsInPredictNavigator,
  getAllRouteValues,
} from './useIsInPredictNavigator';
import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useNavigationState } from '@react-navigation/native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigationState: jest.fn(),
}));

describe('useIsInPredictNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when in Predict navigator', () => {
    it('returns true when MARKET_LIST route exists in navigation state', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'Home-123',
                  name: 'Home',
                },
                {
                  key: 'PredictMarketList-456',
                  name: Routes.PREDICT.MARKET_LIST,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when MARKET_DETAILS route is active', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'PredictMarketList-123',
                  name: Routes.PREDICT.MARKET_LIST,
                },
                {
                  key: 'PredictMarketDetails-456',
                  name: Routes.PREDICT.MARKET_DETAILS,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when BUY_PREVIEW modal is active', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'PredictMarketDetails-123',
                  name: Routes.PREDICT.MARKET_DETAILS,
                },
                {
                  key: 'PredictBuyPreview-456',
                  name: Routes.PREDICT.MODALS.BUY_PREVIEW,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when SELL_PREVIEW modal is active', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'PredictMarketDetails-123',
                  name: Routes.PREDICT.MARKET_DETAILS,
                },
                {
                  key: 'PredictSellPreview-456',
                  name: Routes.PREDICT.MODALS.SELL_PREVIEW,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });

    it('returns true when ACTIVITY_DETAIL route is active', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'PredictMarketList-123',
                  name: Routes.PREDICT.MARKET_LIST,
                },
                {
                  key: 'PredictActivityDetail-456',
                  name: Routes.PREDICT.ACTIVITY_DETAIL,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });
  });

  describe('when not in Predict navigator', () => {
    it('returns false when no Predict route exists', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'Home-123',
                  name: 'Home',
                },
                {
                  key: 'Settings-456',
                  name: 'SettingsView',
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when routes array is empty', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when routes array is undefined', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: undefined,
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when state is undefined', () => {
      const mockState = {
        routes: [{}],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is empty', () => {
      const mockState = {
        routes: [],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns false when route name is case-sensitive mismatch', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'predict-123',
                  name: 'predictmarketlist',
                },
                {
                  key: 'PREDICT-456',
                  name: 'PREDICTMARKETLIST',
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('handles route objects without name property gracefully', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'route-without-name',
                },
                {
                  key: 'PredictMarketList-123',
                  name: Routes.PREDICT.MARKET_LIST,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });

    it('handles route objects with null name property', () => {
      const mockState = {
        routes: [
          {
            state: {
              routes: [
                {
                  key: 'route-with-null-name',
                  name: null,
                },
                {
                  key: 'PredictMarketList-123',
                  name: Routes.PREDICT.MARKET_LIST,
                },
              ],
            },
          },
        ],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(true);
    });
  });

  describe('navigation state structure variations', () => {
    it('returns false when routes[0] is undefined', () => {
      const mockState = {
        routes: [undefined],
      };

      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(mockState),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is null', () => {
      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(null),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });

    it('returns false when navigation state is undefined', () => {
      (useNavigationState as jest.Mock).mockImplementation((selector) =>
        selector(undefined),
      );

      const { result } = renderHookWithProvider(() =>
        useIsInPredictNavigator(),
      );

      expect(result.current).toBe(false);
    });
  });
});

describe('getAllRouteValues', () => {
  describe('basic functionality', () => {
    it('extracts string values from flat object', () => {
      const routeObject = {
        ROOT: 'Predict',
        MARKET_LIST: 'PredictMarketList',
      };

      const result = getAllRouteValues(routeObject);

      expect(result).toEqual(['Predict', 'PredictMarketList']);
    });

    it('extracts string values from nested object', () => {
      const routeObject = {
        ROOT: 'Predict',
        MODALS: {
          ROOT: 'PredictModals',
          BUY_PREVIEW: 'PredictBuyPreview',
        },
      };

      const result = getAllRouteValues(routeObject);

      expect(result).toEqual(['Predict', 'PredictModals', 'PredictBuyPreview']);
    });

    it('extracts string values from deeply nested object', () => {
      const routeObject = {
        ROOT: 'Predict',
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

      const result = getAllRouteValues(routeObject);

      expect(result).toEqual([
        'Predict',
        'VeryDeepRoute',
        'AnotherRoute',
        'ModalRoute',
      ]);
    });

    it('extracts all Predict routes from Routes.PREDICT object', () => {
      const result = getAllRouteValues(Routes.PREDICT);

      expect(result).toContain(Routes.PREDICT.ROOT);
      expect(result).toContain(Routes.PREDICT.MARKET_LIST);
      expect(result).toContain(Routes.PREDICT.MARKET_DETAILS);
      expect(result).toContain(Routes.PREDICT.MODALS.BUY_PREVIEW);
      expect(result).toContain(Routes.PREDICT.MODALS.SELL_PREVIEW);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty object', () => {
      const routeObject = {};

      const result = getAllRouteValues(routeObject);

      expect(result).toEqual([]);
    });
  });
});
