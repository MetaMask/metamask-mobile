import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsProModeEnabledFlag } from '../selectors/featureFlags';
import {
  selectPerpsLastViewedMarketSymbol,
  selectPerpsMode,
} from '../selectors/perpsController';
import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  buildDefaultProMarket,
  isPerpsProModeActive,
  useIsPerpsProModeActive,
  getPerpsHomeNavigationTarget,
  useGetPerpsHomeNavigationTarget,
  useNavigateToPerpsHome,
  useDropPerpsHomeFromStackHistory,
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
  selectPerpsLastViewedMarketSymbol: jest.fn(() => 'BTC'),
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
const mockSelectPerpsLastViewedMarketSymbol =
  selectPerpsLastViewedMarketSymbol as jest.MockedFunction<
    typeof selectPerpsLastViewedMarketSymbol
  >;

const mockState = {} as RootState;

const stubPerpsModeSelectors = ({
  flagEnabled,
  mode,
  lastViewed = PERPS_DEFAULT_PRO_MARKET_SYMBOL,
}: {
  flagEnabled: boolean;
  mode: PerpsMode;
  lastViewed?: string;
}) => {
  mockSelectPerpsProModeEnabledFlag.mockReturnValue(flagEnabled);
  mockSelectPerpsMode.mockReturnValue(mode);
  mockSelectPerpsLastViewedMarketSymbol.mockReturnValue(lastViewed);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPerpsProModeEnabledFlag) return flagEnabled;
    if (selector === selectPerpsMode) return mode;
    if (selector === selectPerpsLastViewedMarketSymbol) return lastViewed;
    return undefined;
  });
};

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

  it('builds a Pro market payload from a last-viewed symbol', () => {
    const market = buildDefaultProMarket('ETH');

    expect(market.symbol).toBe('ETH');
  });

  it('falls back to BTC when the last-viewed symbol is empty', () => {
    const market = buildDefaultProMarket('');

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

    it('targets the last viewed Pro market instead of Perps Home when Pro mode is active', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(true);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);
      mockSelectPerpsLastViewedMarketSymbol.mockReturnValue('ETH');

      expect(
        getPerpsHomeNavigationTarget(mockState, { source: 'deeplink' }),
      ).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: buildDefaultProMarket('ETH'),
          source: 'deeplink',
        },
      });
    });

    it('lets an explicit market param win over the last viewed market', () => {
      mockSelectPerpsProModeEnabledFlag.mockReturnValue(true);
      mockSelectPerpsMode.mockReturnValue(PerpsMode.Pro);
      mockSelectPerpsLastViewedMarketSymbol.mockReturnValue('ETH');

      expect(
        getPerpsHomeNavigationTarget(mockState, {
          market: buildDefaultProMarket('SOL'),
        }),
      ).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: buildDefaultProMarket('SOL'),
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

    it('targets the last viewed Pro market instead of Perps Home when Pro mode is active', () => {
      stubPerpsModeSelectors({
        flagEnabled: true,
        mode: PerpsMode.Pro,
        lastViewed: 'ETH',
      });

      const { result } = renderHook(() => useGetPerpsHomeNavigationTarget());

      expect(result.current({ source: 'main_action_button' })).toEqual({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: buildDefaultProMarket('ETH'),
          source: 'main_action_button',
        },
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
      });
    });

    it('enters the Perps stack at the last viewed Pro market when Pro mode is active', () => {
      stubPerpsModeSelectors({
        flagEnabled: true,
        mode: PerpsMode.Pro,
        lastViewed: 'ETH',
      });

      const { result } = renderHook(() => useNavigateToPerpsHome());

      result.current();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: buildDefaultProMarket('ETH') },
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
      });
    });
  });

  describe('useDropPerpsHomeFromStackHistory', () => {
    const buildRoute = (name: string, key: string) => ({ name, key });

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

      // Assert - Home is gone and the market stays focused at its new index.
      expect(mockReset).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 1,
          routes: [
            buildRoute(Routes.PERPS.MARKET_LIST, 'list-1'),
            buildRoute(Routes.PERPS.MARKET_DETAILS, 'market-1'),
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
