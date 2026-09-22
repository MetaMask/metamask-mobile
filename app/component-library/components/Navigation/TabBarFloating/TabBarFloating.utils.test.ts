import { Platform } from 'react-native';

import {
  TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
  TAB_BAR_FLOATING_INSET_REDUCTION,
  TAB_BAR_FLOATING_SYSTEM_BAR_GAP,
} from './TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from './TabBarFloating.utils';

/** A notched iPhone's home-indicator inset. */
const IOS_HOME_INDICATOR_INSET = 34;
/** An Android three-button navigation bar, the tallest system bar the app sees. */
const ANDROID_NAV_BAR_INSET = 48;
/** An Android gesture-navigation hint bar. */
const ANDROID_GESTURE_INSET = 24;

describe('getTabBarFloatingBottomPadding', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('tightens the home-indicator inset so the bar sits closer to the edge', () => {
      expect(getTabBarFloatingBottomPadding(IOS_HOME_INDICATOR_INSET)).toBe(
        IOS_HOME_INDICATOR_INSET - TAB_BAR_FLOATING_INSET_REDUCTION,
      );
    });

    it('falls back to the floor on devices with no home indicator', () => {
      expect(getTabBarFloatingBottomPadding(0)).toBe(
        TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
      );
    });
  });

  describe('on Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    // Trimming the inset put the pill under the system navigation bar, and
    // consuming the inset exactly left it resting on one, because a
    // three-button bar fills its whole inset.
    it('leaves a gap above a three-button system navigation bar', () => {
      expect(getTabBarFloatingBottomPadding(ANDROID_NAV_BAR_INSET)).toBe(
        ANDROID_NAV_BAR_INSET + TAB_BAR_FLOATING_SYSTEM_BAR_GAP,
      );
    });

    it('leaves the same gap above a gesture navigation hint bar', () => {
      expect(getTabBarFloatingBottomPadding(ANDROID_GESTURE_INSET)).toBe(
        ANDROID_GESTURE_INSET + TAB_BAR_FLOATING_SYSTEM_BAR_GAP,
      );
    });

    it('falls back to the floor on emulators reporting no inset', () => {
      expect(getTabBarFloatingBottomPadding(0)).toBe(
        TAB_BAR_FLOATING_MIN_BOTTOM_PADDING,
      );
    });
  });
});
