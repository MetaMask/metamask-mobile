import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsProModeEnabledFlag } from '../selectors/featureFlags';
import { selectPerpsMode } from '../selectors/perpsController';
import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  PERPS_HOME_DROPPED_FROM_HISTORY_PARAM,
  buildDefaultProMarket,
  isPerpsProModeActive,
  useIsPerpsProModeActive,
  getPerpsHomeNavigationTarget,
  useGetPerpsHomeNavigationTarget,
  useNavigateToPerpsHome,
  useDropPerpsHomeFromStackHistory,
  toPerpsNavigatorScreenParams,
  wasPerpsHomeDroppedFromHistory,
  withHomeDroppedFromHistory,
} from './perpsModeSwitch';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGetState = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    reset: mockReset,
    getState: mockGetState,
  }),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPerpsProModeEnabledFlag: jest.fn(),
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsMode: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectPerpsProModeEnabledFlag =
  selectPerpsProModeEnabledFlag as jest.MockedFunction<
    typeof selectPerpsProModeEnabledFlag
  >;
const mockSelectPerpsMode = selectPerpsMode as jest.MockedFunction<
  typeof selectPerpsMode
>;

const mockState = {} as RootState;

describe('perpsModeSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults the Pro market symbol to BTC', () => {
    expect(PERPS_DEFAULT_PRO_MARKET_SYMBOL).toBe('BTC');
  });

  it('builds a minimal default Pro market payload', () => {
    const market = buildDefaultProMarket();

    expect(market.symbol).toBe(PERPS_DEFAULT_PRO_MARKET_SYMBOL);
  });

  describe('isPerpsProModeActive', () => {
    it('returns true when the flag is enabled and mode is Pro', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(true);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);

      expect(isPerpsProModeActive(mockState)).toBe(true);
    });

    it('returns false when the flag is disabled even if mode is Pro', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(false);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);

      expect(isPerpsProModeActive(mockState)).toBe(false);
    });

    it('returns false when mode is Lite even if the flag is enabled', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(true);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Lite);

      expect(isPerpsProModeActive(mockState)).toBe(false);
    });
  });

  describe('useIsPerpsProModeActive', () => {
    it('returns true when the flag is enabled and mode is Pro', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return true;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => useIsPerpsProModeActive());

      expect(result.current).toBe(true);
    });

    it('returns false when the flag is disabled', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return false;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => useIsPerpsProModeActive());

      expect(result.current).toBe(false);
    });
  });

  describe('getPerpsHomeNavigationTarget', () => {
    it('targets Perps Home when Pro mode is inactive', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(false);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Lite);

      expect(getPerpsHomeNavigationTarget(mockState)).toEqual({
        screen: Routes.PERPS.PERPS_HOME,
        params: {},
      });
    });

    it('carries extra params through to Perps Home when Pro mode is inactive', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(false);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Lite);

      expect(
        getPerpsHomeNavigationTarget(mockState, { source: 'deeplink' }),
      ).toEqual({
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'deeplink' },
      });
    });

    it('targets the default Pro market instead of Perps Home when Pro mode is active', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(true);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);

      expect(
        getPerpsHomeNavigationTarget(mockState, { source: 'deeplink' }),
      ).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: buildDefaultProMarket(),
          source: 'deeplink',
        },
      });
    });
  });

  describe('useGetPerpsHomeNavigationTarget', () => {
    it('targets Perps Home when Pro mode is inactive', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return false;
        if (selector === selectPerpsMode) return PerpsMode.Lite;
        return undefined;
      });

      const { result } = renderHook(() => useGetPerpsHomeNavigationTarget());

      expect(result.current({ source: 'main_action_button' })).toEqual({
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'main_action_button' },
      });
    });

    it('targets the default Pro market instead of Perps Home when Pro mode is active', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return true;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => useGetPerpsHomeNavigationTarget());

      expect(result.current({ source: 'main_action_button' })).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: buildDefaultProMarket(),
          source: 'main_action_button',
        },
      });
    });

    it('returns a stable function reference across renders when Pro mode is unchanged', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return false;
        if (selector === selectPerpsMode) return PerpsMode.Lite;
        return undefined;
      });

      const { result, rerender } = renderHook(() =>
        useGetPerpsHomeNavigationTarget(),
      );
      const firstReference = result.current;
      rerender(undefined);

      expect(result.current).toBe(firstReference);
    });
  });

  describe('useNavigateToPerpsHome', () => {
    it('enters the Perps stack at Perps Home when Pro mode is inactive', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return false;
        if (selector === selectPerpsMode) return PerpsMode.Lite;
        return undefined;
      });

      const { result } = renderHook(() => useNavigateToPerpsHome());

      // Act
      result.current({ source: 'activity_details' });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'activity_details' },
        pop: true,
      });
    });

    it('enters the Perps stack at the default Pro market when Pro mode is active', () => {
      // Arrange - Perps Home must never be shown while Pro mode is active.
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return true;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => useNavigateToPerpsHome());

      // Act
      result.current();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: buildDefaultProMarket() },
        pop: true,
      });
    });

    // The deposit confirmation sits on top of the Pro market screen when this
    // runs. Without `pop` React Navigation pushes a second market screen and
    // Back returns to add funds.
    it('pops back to the Pro market instead of stacking a duplicate over the caller', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPerpsProModeEnabledFlag) return true;
        if (selector === selectPerpsMode) return PerpsMode.Pro;
        return undefined;
      });

      const { result } = renderHook(() => useNavigateToPerpsHome());

      // Act
      result.current();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({ pop: true }),
      );
    });
  });

  describe('toPerpsNavigatorScreenParams', () => {
    it('carries the resolved screen and params through unchanged', () => {
      // Arrange
      const target = {
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'wallet_actions' },
      };

      // Act
      const params = toPerpsNavigatorScreenParams(target);

      // Assert
      expect(params).toEqual({
        screen: Routes.PERPS.PERPS_HOME,
        params: { source: 'wallet_actions' },
      });
    });

    it('adds pop only when the caller asks to return to an existing entry', () => {
      // Arrange
      const target = {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: buildDefaultProMarket() },
      };

      // Act
      const params = toPerpsNavigatorScreenParams(target, { pop: true });

      // Assert
      expect(params).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: buildDefaultProMarket() },
        pop: true,
      });
    });
  });

  describe('wasPerpsHomeDroppedFromHistory', () => {
    it('returns true when the focused route was stamped after Home was dropped', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: Routes.PERPS.MARKET_DETAILS,
            key: 'market-1',
            params: { [PERPS_HOME_DROPPED_FROM_HISTORY_PARAM]: true },
          },
        ],
      };

      expect(wasPerpsHomeDroppedFromHistory(state)).toBe(true);
    });

    it('returns false when the focused route has no dropped-Home stamp', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: Routes.PERPS.MARKET_DETAILS,
            key: 'market-1',
            params: { source: 'explore' },
          },
        ],
      };

      expect(wasPerpsHomeDroppedFromHistory(state)).toBe(false);
    });

    it('returns false when navigator state is missing', () => {
      expect(wasPerpsHomeDroppedFromHistory(undefined)).toBe(false);
    });

    it('reads the stamp produced by withHomeDroppedFromHistory', () => {
      const state = {
        index: 0,
        routes: [
          {
            params: withHomeDroppedFromHistory({
              source: 'perps_home',
            }),
          },
        ],
      };

      expect(wasPerpsHomeDroppedFromHistory(state)).toBe(true);
    });
  });

  describe('useDropPerpsHomeFromStackHistory', () => {
    const buildRoute = (name: string, key: string, params?: object) => ({
      name,
      key,
      ...(params ? { params } : {}),
    });
    const withDroppedHomeStamp = (route: { name: string; key: string }) => ({
      ...route,
      params: { [PERPS_HOME_DROPPED_FROM_HISTORY_PARAM]: true },
    });

    it('removes Perps Home while keeping the rest of the stack and the focused screen', () => {
      // Arrange - Home → market list → market, focused on the market.
      mockGetState.mockReturnValue({
        index: 2,
        routes: [
          buildRoute(Routes.PERPS.PERPS_HOME, 'home-1'),
          buildRoute(Routes.PERPS.MARKET_LIST, 'list-1'),
          buildRoute(Routes.PERPS.MARKET_DETAILS, 'market-1'),
        ],
      });

      const { result } = renderHook(() => useDropPerpsHomeFromStackHistory());

      // Act
      result.current();

      // Assert - Home is gone, the market stays focused, and remaining
      // routes are stamped so back can tell this from an Explore entry.
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            withDroppedHomeStamp(
              buildRoute(Routes.PERPS.MARKET_LIST, 'list-1'),
            ),
            withDroppedHomeStamp(
              buildRoute(Routes.PERPS.MARKET_DETAILS, 'market-1'),
            ),
          ],
        }),
      );
    });

    it('keeps existing route params when stamping remaining routes', () => {
      mockGetState.mockReturnValue({
        index: 1,
        routes: [
          buildRoute(Routes.PERPS.PERPS_HOME, 'home-1'),
          buildRoute(Routes.PERPS.MARKET_DETAILS, 'market-1', {
            source: 'perps_home',
          }),
        ],
      });

      const { result } = renderHook(() => useDropPerpsHomeFromStackHistory());

      result.current();

      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 0,
          routes: [
            {
              name: Routes.PERPS.MARKET_DETAILS,
              key: 'market-1',
              params: {
                source: 'perps_home',
                [PERPS_HOME_DROPPED_FROM_HISTORY_PARAM]: true,
              },
            },
          ],
        }),
      );
    });

    it('leaves the stack alone when Perps Home is not in history', () => {
      // Arrange - Pro entry points never seed Home beneath the market.
      mockGetState.mockReturnValue({
        index: 0,
        routes: [buildRoute(Routes.PERPS.MARKET_DETAILS, 'market-1')],
      });

      const { result } = renderHook(() => useDropPerpsHomeFromStackHistory());

      // Act
      result.current();

      // Assert
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('leaves the stack alone when Perps Home is the only entry', () => {
      // Arrange - dropping it would leave the navigator with nothing to render.
      mockGetState.mockReturnValue({
        index: 0,
        routes: [buildRoute(Routes.PERPS.PERPS_HOME, 'home-1')],
      });

      const { result } = renderHook(() => useDropPerpsHomeFromStackHistory());

      // Act
      result.current();

      // Assert
      expect(mockReset).not.toHaveBeenCalled();
    });

    it('does nothing when the navigator has no state yet', () => {
      // Arrange
      mockGetState.mockReturnValue(undefined);

      const { result } = renderHook(() => useDropPerpsHomeFromStackHistory());

      // Act
      result.current();

      // Assert
      expect(mockReset).not.toHaveBeenCalled();
    });
  });
});
