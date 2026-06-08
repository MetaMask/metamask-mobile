import navigationReducer, { initialNavigationState } from './index';
import {
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
});
