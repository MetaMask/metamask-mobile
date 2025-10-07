import React, { useContext } from 'react';
import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import ElevatedView from 'react-native-elevated-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabCountIcon from '../Tabs/TabCountIcon';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import FeatherIcons from 'react-native-vector-icons/Feather';
import { MetaMetricsEvents } from '../../../core/Analytics';

import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';

// NOTE: not needed anymore. The use of BottomTabBar already accomodates the home indicator height
// TODO: test on an android device
// const HOME_INDICATOR_HEIGHT = 0;
// const defaultBottomBarPadding = 0;

const createStyles = (colors, tabBarBottomInset = 0) =>
  StyleSheet.create({
    bottomBar: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      flex: 0,
      borderTopWidth: Device.isAndroid() ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      justifyContent: 'space-between',
      paddingBottom: tabBarBottomInset,
    },
    iconButton: {
      height: 60,
      width: 24,
      justifyContent: 'space-around',
      alignItems: 'center',
      textAlign: 'center',
      flex: 1,
    },
    tabIcon: {
      marginTop: 0,
      width: 24,
      height: 24,
    },
    disabledIcon: {
      color: colors.icon.muted,
    },
    icon: {
      width: 24,
      height: 24,
      color: colors.icon.default,
      textAlign: 'center',
    },
  });

/**
 * Browser bottom bar that contains icons for navigation
 * tab management, url change and other options
 */
const BrowserBottomBar = ({
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  showTabs,
  showUrlModal,
  goHome,
  toggleOptions,
  toggleFullscreen,
  isFullscreen,
}) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { colors } = useContext(ThemeContext) || { colors: mockTheme.colors };
  const { trackEvent, createEventBuilder } = useMetrics();

  const styles = createStyles(colors, isFullscreen ? bottomInset : 0);

  const trackSearchEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_SEARCH_USED)
        .addProperties({
          option_chosen: 'Browser Bottom Bar Menu',
          number_of_tabs: undefined,
        })
        .build(),
    );
  };

  const trackNavigationEvent = (navigationOption) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_NAVIGATION)
        .addProperties({
          option_chosen: navigationOption,
          os: Platform.OS,
        })
        .build(),
    );
  };

  const onSearchPress = () => {
    showUrlModal?.();
    trackSearchEvent();
  };

  const onBackPress = () => {
    goBack?.();
    trackNavigationEvent('Go Back');
  };

  const onForwardPress = () => {
    goForward?.();
    trackNavigationEvent('Go Forward');
  };

  const onHomePress = () => {
    goHome?.();
    trackNavigationEvent('Go Home');
  };

  const onToggleFullscreenPress = () => {
    if (isFullscreen) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BROWSER_CLOSED_FULLSCREEN).build(),
      );
    } else {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BROWSER_OPENED_FULLSCREEN).build(),
      );
    }
    toggleFullscreen?.();
  };

  const homeDisabled = !goHome;
  const optionsDisabled = !toggleOptions;

  return (
    <ElevatedView elevation={11} style={styles.bottomBar}>
      <TouchableOpacity
        onPress={onBackPress}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.BACK_BUTTON}
        disabled={!canGoBack}
      >
        <Icon
          name="angle-left"
          size={24}
          style={[styles.icon, !canGoBack ? styles.disabledIcon : {}]}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onForwardPress}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.FORWARD_BUTTON}
        disabled={!canGoForward}
      >
        <Icon
          name="angle-right"
          size={24}
          style={[styles.icon, !canGoForward ? styles.disabledIcon : {}]}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSearchPress}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.SEARCH_BUTTON}
      >
        <FeatherIcons name="search" size={24} style={styles.icon} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={showTabs}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.TABS_BUTTON}
      >
        <TabCountIcon style={styles.tabIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onHomePress}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.HOME_BUTTON}
        disabled={homeDisabled}
      >
        <SimpleLineIcons
          name="home"
          size={22}
          style={[styles.icon, homeDisabled && styles.disabledIcon]}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggleFullscreenPress}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON}
        disabled={!toggleFullscreen}
      >
        <MaterialIcon
          name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
          size={22}
          style={[styles.icon, !toggleFullscreen ? styles.disabledIcon : {}]}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={toggleOptions}
        style={styles.iconButton}
        testID={BrowserViewSelectorsIDs.OPTIONS_BUTTON}
        disabled={optionsDisabled}
      >
        <MaterialIcon
          name="more-horiz"
          size={22}
          style={[styles.icon, optionsDisabled && styles.disabledIcon]}
        />
      </TouchableOpacity>
    </ElevatedView>
  );
};

// PropTypes for type checking
BrowserBottomBar.propTypes = {
  /**
   * Boolean that determines if you can navigate back
   */
  canGoBack: PropTypes.bool,
  /**
   * Boolean that determines if you can navigate forward
   */
  canGoForward: PropTypes.bool,
  /**
   * Function that allows you to navigate back
   */
  goBack: PropTypes.func,
  /**
   * Function that allows you to navigate forward
   */
  goForward: PropTypes.func,
  /**
   * Function that triggers the tabs view
   */
  showTabs: PropTypes.func,
  /**
   * Function that triggers the change url modal view
   */
  showUrlModal: PropTypes.func,
  /**
   * Function that redirects to the home screen
   */
  goHome: PropTypes.func,
  /**
   * Function that toggles the options menu
   */
  toggleOptions: PropTypes.func,
  /**
   * Function that toggles fullscreen mode
   */
  toggleFullscreen: PropTypes.func,
  /**
   * Boolean that determines if currently in fullscreen mode
   */
  isFullscreen: PropTypes.bool,
};

export default React.memo(BrowserBottomBar);
