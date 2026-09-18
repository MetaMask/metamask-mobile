import { useContext, useLayoutEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
/*
 * Not declared in package.json, but a hard dependency of
 * `@react-navigation/native-stack` (`@react-navigation/elements: ^2.9.36`), so
 * it is always installed. Declare it directly before this experiment ships —
 * adding it now would desync the lockfile mid-spike.
 */
// eslint-disable-next-line import-x/no-extraneous-dependencies -- see above
import { HeaderHeightContext } from '@react-navigation/elements';
import type {
  NativeStackHeaderItem,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { useTheme } from '../../util/theme';
import { selectNativeHeaderEnabled } from '../../reducers/experimentalSettings/selectors';

interface UseNativeHeaderParams {
  /**
   * Title for the native bar. Omit (or pass an empty string) on screens whose
   * chrome shows no title, so the bar matches the JS header it replaces.
   */
  title?: string;
  /**
   * Leading `UIBarButtonItem`s. Must be stable (`useCallback`) or the bar is
   * reconfigured on every render.
   *
   * Only needed by a screen that is its stack's *initial route*: everything
   * pushed on top of it gets the system back button for free. Native-stack
   * only draws that button when it can pop within its own stack, and
   * `headerBackVisible` is documented as having "no effect on the first screen
   * in the stack" — so the root has to supply its own chevron.
   */
  leftItems?: () => NativeStackHeaderItem[];
  /**
   * Trailing `UIBarButtonItem`s. Must be stable (`useCallback`) or the bar is
   * reconfigured on every render.
   *
   * On iOS 26 a run of adjacent items shares one glass background; insert
   * `{ type: 'spacing', spacing: n }` between them to split that into separate
   * capsules, i.e. into distinct action groups.
   */
  rightItems?: () => NativeStackHeaderItem[];
  /**
   * A `UISearchController` in the bar itself, rather than a search field laid
   * out as the first row of the content. The native one tucks under the title
   * and collapses on scroll; a JS one placed above the scroller ends up beneath
   * the transparent bar, since the nav-bar inset applies to the scroller.
   *
   * Must be stable (`useMemo`) or the bar is reconfigured on every render.
   */
  searchBar?: NativeStackNavigationOptions['headerSearchBarOptions'];
  /**
   * Suppress the system back button, for a screen that supplies its own single
   * dismiss action instead.
   *
   * Worth setting whenever going back has to do more than pop — fire a
   * cancellation callback, tear down a session — since the system button only
   * pops, and would otherwise sit alongside the real action doing a quieter,
   * subtly different thing.
   */
  hideBackButton?: boolean;
  /**
   * Opt a particular instance out, for a screen that can render in a shape the
   * native bar does not cover — presented as a modal with a close button
   * instead of pushed with a back button, say. Defaults to `true`; when
   * `false` the hook reports the experiment as off and the caller keeps its
   * own header.
   */
  enabled?: boolean;
}

/**
 * EXPERIMENTAL — Developer Options > Navigation > "Native header (Home)".
 *
 * Hands a screen's toolbar to UIKit so the bar draws the iOS 26 glass material
 * and content scrolls underneath it, instead of the toolbar being reimplemented
 * in JS. Returns whether the experiment is on, so callers can skip rendering
 * their own header and avoid drawing a second, duplicate one.
 *
 * Every screen in a flow must configure its bar on the *same* navigator. A bar
 * owned by a parent navigator and a bar owned by the stack being pushed are two
 * different `UINavigationBar`s, so UIKit cannot animate one into the other: the
 * push tears the first one down and the pop slides the second in from the top,
 * instead of the title and back chevron morphing across the transition. This
 * hook therefore always configures the screen's own navigator.
 *
 * Callers that scroll should also set `contentInsetAdjustmentBehavior="automatic"`
 * while this is enabled, so UIKit applies the nav-bar inset: content starts
 * below the glass but still passes under it on scroll.
 */
export const useNativeHeader = ({
  title,
  leftItems,
  rightItems,
  searchBar,
  hideBackButton = false,
  enabled = true,
}: UseNativeHeaderParams = {}): boolean => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const isFlagOn = useSelector(selectNativeHeaderEnabled);
  const isNativeHeaderEnabled = isFlagOn && enabled;

  /*
   * Transparent is what makes it glass: the native bar draws the iOS 26
   * material and the content passes under it. An opaque bar would take
   * `colors.card` and push the content below instead.
   *
   * The tint and title colours are set per screen rather than globally because
   * NavigationProvider hands react-navigation a light `DefaultTheme` with only
   * `background` overridden — so left alone the bar renders white and the
   * actions take `colors.primary` (iOS blue). Changing the global theme would
   * touch every other native header in the app.
   */
  const options = useMemo(
    () => ({
      headerShown: true,
      headerTransparent: true,
      headerTintColor: colors.icon.default,
      headerTitleStyle: { color: colors.text.default },
      /*
       * Chevron only. Left at its default, iOS 18+ labels the back button with
       * the previous screen's title ("Home", "Settings", ...), which both
       * repeats what the user just came from and makes the leading capsule's
       * width jump from screen to screen.
       */
      headerBackButtonDisplayMode: 'minimal' as const,
      title: title ?? '',
      ...(leftItems ? { unstable_headerLeftItems: leftItems } : {}),
      ...(rightItems ? { unstable_headerRightItems: rightItems } : {}),
      ...(searchBar ? { headerSearchBarOptions: searchBar } : {}),
      ...(hideBackButton ? { headerBackVisible: false } : {}),
    }),
    [colors, title, leftItems, rightItems, searchBar, hideBackButton],
  );

  useLayoutEffect(() => {
    if (!isNativeHeaderEnabled) {
      return;
    }

    navigation.setOptions(options);
  }, [isNativeHeaderEnabled, navigation, options]);

  return isNativeHeaderEnabled;
};

/**
 * The glass chrome as navigator/screen `options`, or `{ headerShown: false }`
 * with the experiment off.
 *
 * Belongs in a navigator's `screenOptions` (or a screen's static `options`)
 * rather than being applied from inside the screen. `setOptions` from a screen
 * effect lands after that screen mounts, so a push would start with no bar and
 * switch one on mid-flight — which reads as the toolbar fading in rather than
 * the chevron and title animating across. Set here, the bar exists from the
 * first frame and UIKit animates one continuous bar for the flow.
 *
 * Screens then use `useNativeHeader` for their own title and bar items.
 */
export const useNativeHeaderScreenOptions = () => {
  const { colors } = useTheme();
  const isNativeHeaderEnabled = useSelector(selectNativeHeaderEnabled);

  return useMemo(
    () =>
      isNativeHeaderEnabled
        ? {
            headerShown: true,
            headerTransparent: true,
            headerTintColor: colors.icon.default,
            headerTitleStyle: { color: colors.text.default },
            headerBackButtonDisplayMode: 'minimal' as const,
          }
        : { headerShown: false },
    [isNativeHeaderEnabled, colors],
  );
};

/**
 * Top padding that clears the transparent native bar, or `0` when the
 * experiment is off.
 *
 * For screens whose root is not a `ScrollView` — a list component that owns its
 * own scroller, or a plain container — where `contentInsetAdjustmentBehavior`
 * has nothing to attach to and the content would otherwise start underneath the
 * bar. Prefer `contentInsetAdjustmentBehavior="automatic"` where there is a
 * `ScrollView` to put it on, so content still passes under the glass on scroll.
 *
 * Reads the context rather than calling `useHeaderHeight`, which throws when
 * there is no header — exactly the case with the experiment switched off.
 */
export const useNativeHeaderInset = (): number => {
  const isNativeHeaderEnabled = useSelector(selectNativeHeaderEnabled);
  const headerHeight = useContext(HeaderHeightContext);

  return isNativeHeaderEnabled ? (headerHeight ?? 0) : 0;
};
