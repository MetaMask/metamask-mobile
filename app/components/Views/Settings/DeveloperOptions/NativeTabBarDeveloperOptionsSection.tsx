import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Platform } from 'react-native';
import { Text, TextColor, TextVariant } from '@metamask/design-system-react-native';

import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import {
  setNativeHeaderEnabled,
  setNativeTabBarEnabled,
} from '../../../../actions/experimental';
import {
  selectNativeHeaderEnabled,
  selectNativeTabBarEnabled,
} from '../../../../reducers/experimentalSettings/selectors';
import { SettingsToggleRow } from '../components/SettingsToggleRow';
import styleSheet from './DeveloperOptions.styles';

/**
 * Experimental: swaps the custom JS tab bar for the platform-native one
 * (`TabsHost` / `TabsScreen` from react-native-screens, which wraps
 * `UITabBarController` on iOS). Used to evaluate the iOS 26 Liquid Glass
 * tab bar and its scroll-minimize behaviour without mimicking it in JS.
 *
 * The underlying react-native-screens tabs API is marked EXPERIMENTAL by
 * its authors, so this is gated to Developer Options and defaults to off.
 */
export default function NativeTabBarDeveloperOptionsSection() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const dispatch = useDispatch();

  const isNativeTabBarEnabled = useSelector(selectNativeTabBarEnabled);
  const isNativeHeaderEnabled = useSelector(selectNativeHeaderEnabled);

  const handleToggle = useCallback(
    (value: boolean) => {
      dispatch(setNativeTabBarEnabled(value));
    },
    [dispatch],
  );

  const handleHeaderToggle = useCallback(
    (value: boolean) => {
      dispatch(setNativeHeaderEnabled(value));
    },
    [dispatch],
  );

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {'Navigation'}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {
          'Experimental navigation surfaces. These are prototypes for design exploration, not production behaviour.'
        }
      </Text>

      <SettingsToggleRow
        title={'Native tab bar'}
        description={
          Platform.OS === 'ios'
            ? 'Replaces the custom tab bar with the native UITabBarController. On iOS 26 this renders the system Liquid Glass tab bar and minimizes on scroll. Tab icons become SF Symbols. Requires an app restart to take effect.'
            : 'Replaces the custom tab bar with the native platform tab bar. Requires an app restart to take effect.'
        }
        value={isNativeTabBarEnabled}
        onValueChange={handleToggle}
        testID="developer-options-native-tab-bar-toggle"
      />

      <SettingsToggleRow
        title={'Native header (Home)'}
        description={
          Platform.OS === 'ios'
            ? 'Replaces the custom Home header with a native UINavigationBar. On iOS 26 the action buttons become real glass UIBarButtonItems (variant "prominent") with a native notification badge. The account picker is not yet ported — it is not expressible as a bar button item. Requires an app restart.'
            : 'iOS only — no effect on Android.'
        }
        value={isNativeHeaderEnabled}
        onValueChange={handleHeaderToggle}
        testID="developer-options-native-header-toggle"
      />
    </>
  );
}
