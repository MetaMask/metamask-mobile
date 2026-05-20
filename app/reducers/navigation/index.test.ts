import navigationReducer, { initialNavigationState } from './index';
import { selectIsMainNavigatorReady } from './selectors';
import {
  NavigationActionType,
  mainNavigatorReady,
  setCurrentRoute,
  setCurrentBottomNavRoute,
} from '../../actions/navigation';
import type { RootState } from '../';

describe('navigationReducer', () => {
  it('returns the initial state by default', () => {
    expect(
      navigationReducer(undefined, { type: '@@INIT' } as never),
    ).toStrictEqual(initialNavigationState);
    expect(initialNavigationState.isMainNavigatorReady).toBe(false);
  });

  it('updates currentRoute on SET_CURRENT_ROUTE', () => {
    const next = navigationReducer(
      initialNavigationState,
      setCurrentRoute('Wallet'),
    );
    expect(next.currentRoute).toBe('Wallet');
  });

  it('updates currentBottomNavRoute on SET_CURRENT_BOTTOM_NAV_ROUTE', () => {
    const next = navigationReducer(
      initialNavigationState,
      setCurrentBottomNavRoute('Browser'),
    );
    expect(next.currentBottomNavRoute).toBe('Browser');
  });

  describe('MAIN_NAVIGATOR_READY', () => {
    it('flips isMainNavigatorReady from false to true', () => {
      expect(initialNavigationState.isMainNavigatorReady).toBe(false);

      const next = navigationReducer(
        initialNavigationState,
        mainNavigatorReady(),
      );

      expect(next.isMainNavigatorReady).toBe(true);
    });

    it('is sticky: a second dispatch returns the same state reference', () => {
      const once = navigationReducer(
        initialNavigationState,
        mainNavigatorReady(),
      );
      const twice = navigationReducer(once, mainNavigatorReady());

      // Reference equality proves no unnecessary rerender triggered.
      expect(twice).toBe(once);
      expect(twice.isMainNavigatorReady).toBe(true);
    });

    it('does not leak into unrelated state fields', () => {
      const next = navigationReducer(
        { ...initialNavigationState, currentRoute: 'Wallet' },
        mainNavigatorReady(),
      );

      expect(next.currentRoute).toBe('Wallet');
      expect(next.currentBottomNavRoute).toBe(
        initialNavigationState.currentBottomNavRoute,
      );
    });

    it('has the expected action type string', () => {
      expect(NavigationActionType.MAIN_NAVIGATOR_READY).toBe(
        'MAIN_NAVIGATOR_READY',
      );
      expect(mainNavigatorReady()).toStrictEqual({
        type: NavigationActionType.MAIN_NAVIGATOR_READY,
      });
    });
  });
});

describe('selectIsMainNavigatorReady', () => {
  const buildState = (isMainNavigatorReady: boolean) =>
    ({
      navigation: {
        ...initialNavigationState,
        isMainNavigatorReady,
      },
    } as unknown as RootState);

  it('returns false when MainNavigator has not mounted', () => {
    expect(selectIsMainNavigatorReady(buildState(false))).toBe(false);
  });

  it('returns true when MainNavigator has mounted', () => {
    expect(selectIsMainNavigatorReady(buildState(true))).toBe(true);
  });
});
