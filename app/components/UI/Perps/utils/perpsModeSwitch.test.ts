import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { PerpsMode } from '@metamask/perps-controller';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectPerpsProModeEnabledFlag } from '../selectors/featureFlags';
import { selectPerpsMode } from '../selectors/perpsController';
import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  buildDefaultProMarket,
  isPerpsProModeActive,
  useIsPerpsProModeActive,
  getPerpsHomeNavigationTarget,
  useGetPerpsHomeNavigationTarget,
} from './perpsModeSwitch';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
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
});
