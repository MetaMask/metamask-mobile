import { Platform } from 'react-native';

/**
 * SPIKE(TMCU-1277): swap the four treatment tabs for trivially cheap screens so
 * the tab bar's slide can be judged without screen mount cost. Flip to `true`,
 * reload, compare. `DUMMY_TAB_SCREEN_WEIGHT` in DummyTabScreen dials the cost
 * back in to reproduce a heavy mount. Options are left untouched on every tab
 * so screen content is the only variable. Not for the real branch.
 */
export const DUMMY_TAB_SCREENS = false;

/**
 * SPIKE(TMCU-1277): render HomeTabs with Apple's own tab bar — UITabBarController
 * through react-native-bottom-tabs — instead of the JS floating bar. On iOS 26
 * that is the floating glass pill, the detached search circle, and the lifting
 * indicator, all system-rendered and immune to slow screens.
 *
 * iOS only for the spike: the library renders Material navigation on Android,
 * which is a separate design decision, and the icons are SF Symbols. Tests
 * mock this to `false` so the JS bar stays covered.
 */
export const NATIVE_TAB_BAR = Platform.OS === 'ios';
