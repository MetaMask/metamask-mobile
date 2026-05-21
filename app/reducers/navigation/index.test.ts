import navigationReducer, { initialNavigationState } from './index';
import {
  NavigationActionType,
  mainNavigatorReady,
  setCurrentRoute,
  setCurrentBottomNavRoute,
} from '../../actions/navigation';

describe('navigationReducer', () => {
  it('returns the initial state by default', () => {
    expect(
      navigationReducer(undefined, { type: '@@INIT' } as never),
    ).toStrictEqual(initialNavigationState);
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

  it('creates MAIN_NAVIGATOR_READY without storing it in navigation state', () => {
    expect(NavigationActionType.MAIN_NAVIGATOR_READY).toBe(
      'MAIN_NAVIGATOR_READY',
    );
    expect(mainNavigatorReady()).toStrictEqual({
      type: NavigationActionType.MAIN_NAVIGATOR_READY,
    });

    expect(navigationReducer(initialNavigationState, mainNavigatorReady())).toBe(
      initialNavigationState,
    );
  });
});
