import React, { PureComponent } from 'react';
import {
  InteractionManager,
  Dimensions,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import TabThumbnail from './TabThumbnail';
import { colors as importedColors, fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { ThemeContext, mockTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  MULTI_TAB_ADD_BUTTON,
  MULTI_TAB_CLOSE_ALL_BUTTON,
  MULTI_TAB_DONE_BUTTON,
  MULTI_TAB_NO_TABS_MESSAGE,
} from '../../../../wdio/screen-objects/testIDs/BrowserScreen/MultiTab.testIds';

const THUMB_VERTICAL_MARGIN = 15;
const NAVBAR_SIZE = Device.isIphoneX() ? 88 : 64;
const THUMB_HEIGHT =
  Dimensions.get('window').height / (Device.isIphone5S() ? 4 : 5) +
  THUMB_VERTICAL_MARGIN;
const ROWS_VISIBLE = Math.floor(
  (Dimensions.get('window').height - NAVBAR_SIZE - THUMB_VERTICAL_MARGIN) /
    THUMB_HEIGHT,
);
const TABS_VISIBLE = ROWS_VISIBLE;

const createStyles = (colors, shadows) =>
  StyleSheet.create({
    noTabs: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
    },
    noTabsTitle: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 18,
      marginBottom: 10,
    },
    noTabsDesc: {
      ...fontStyles.normal,
      color: colors.text.alternative,
      fontSize: 14,
    },
    tabAction: {
      flex: 1,
      alignContent: 'center',
      alignSelf: 'flex-start',
      justifyContent: 'center',
    },

    tabActionleft: {
      justifyContent: 'center',
    },
    tabActionRight: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    tabActionDone: {
      ...fontStyles.bold,
    },
    tabActionText: {
      color: colors.primary.default,
      ...fontStyles.normal,
      fontSize: 16,
    },
    actionDisabled: {
      color: colors.text.alternative,
    },
    tabsView: {
      flex: 1,
      backgroundColor: colors.background.default,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    tabActions: {
      paddingHorizontal: 20,
      flexDirection: 'row',
      paddingTop: 17,
      ...shadows.size.md,
      backgroundColor: colors.background.default,
      height: 50,
    },
    tabs: {
      flex: 1,
      backgroundColor: colors.background.alternative,
    },
    tabsContent: {
      padding: 15,
      backgroundColor: importedColors.transparent,
    },
    newTabIcon: {
      marginTop: Device.isIos() ? 3 : 2.5,
      color: colors.primary.inverse,
      fontSize: 24,
      textAlign: 'center',
      justifyContent: 'center',
      alignContent: 'center',
    },
    newTabIconButton: {
      alignSelf: 'center',
      justifyContent: 'flex-start',
      alignContent: 'flex-start',
      backgroundColor: colors.primary.default,
      borderRadius: 100,
      width: 30,
      height: 30,
      marginTop: -7,
    },
  });

/**
 * PureComponent that wraps all the thumbnails
 * representing all the open tabs
 */
export default class Tabs extends PureComponent {
  static propTypes = {
    /**
     * Array of tabs
     */
    tabs: PropTypes.array,
    /**
     * ID of the active tab
     */
    activeTab: PropTypes.number,
    /**
     * Opens a new tab
     */
    newTab: PropTypes.func,
    /**
     * Closes a tab
     */
    closeTab: PropTypes.func,
    /**
     * Closes all tabs
     */
    closeAllTabs: PropTypes.func,
    /**
     * Dismiss the entire view
     */
    closeTabsView: PropTypes.func,
    /**
     * Switches to a specific tab
     */
    switchToTab: PropTypes.func,
    /**
     * Sets the current tab used for the animation
     */
    animateCurrentTab: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  };

  thumbnails = {};

  state = {
    currentTab: null,
  };

  scrollview = React.createRef();

  constructor(props) {
    super(props);
    this.createTabsRef(props.tabs);
  }

  componentDidMount() {
    if (this.props.tabs.length > TABS_VISIBLE) {
      // Find the selected index
      let index = 0;
      this.props.tabs.forEach((tab, i) => {
        if (tab.id === this.props.activeTab) {
          index = i;
        }
      });

      // Calculate the row

      const row = index + 1;

      // Scroll if needed
      const pos = (row - 1) * THUMB_HEIGHT;

      InteractionManager.runAfterInteractions(() => {
        this.scrollview.current &&
          this.scrollview.current.scrollTo({ x: 0, y: pos, animated: true });
      });
    }
  }

  createTabsRef(tabs) {
    tabs.forEach((tab) => {
      this.thumbnails[tab.id] = React.createRef();
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tabs.length !== Object.keys(this.thumbnails).length) {
      this.createTabsRef(this.props.tabs);
    }
  }

  onSwitch = async (tab) => {
    this.props.switchToTab(tab);
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    const shadows = this.context.shadows || mockTheme.shadows;
    return createStyles(colors, shadows);
  };

  renderNoTabs() {
    const styles = this.getStyles();

    return (
      <View style={styles.noTabs}>
        <Text
          style={styles.noTabsTitle}
          {...generateTestId(Platform, MULTI_TAB_NO_TABS_MESSAGE)}
        >
          {strings('browser.no_tabs_title')}
        </Text>
        <Text style={styles.noTabsDesc}>{strings('browser.no_tabs_desc')}</Text>
      </View>
    );
  }
  renderTabs(tabs, activeTab) {
    const styles = this.getStyles();

    return (
      <ScrollView
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
        ref={this.scrollview}
      >
        {tabs.map((tab) => (
          // eslint-disable-next-line react/jsx-key
          <TabThumbnail
            ref={this.thumbnails[tab.id]}
            key={tab.id}
            tab={tab}
            isActiveTab={activeTab === tab.id}
            onClose={this.props.closeTab}
            onSwitch={this.onSwitch}
          />
        ))}
      </ScrollView>
    );
  }

  onNewTabPress = () => {
    const { tabs, newTab } = this.props;
    newTab();
    this.trackNewTabEvent(tabs.length);
  };

  trackNewTabEvent = (tabsNumber) => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.BROWSER_NEW_TAB, {
      option_chosen: 'Browser Bottom Bar Menu',
      number_of_tabs: tabsNumber,
    });
  };

  renderTabActions() {
    const { tabs, closeAllTabs, closeTabsView } = this.props;
    const styles = this.getStyles();

    return (
      <View style={styles.tabActions}>
        <TouchableOpacity
          style={[styles.tabAction, styles.tabActionleft]}
          onPress={closeAllTabs}
          {...generateTestId(Platform, MULTI_TAB_CLOSE_ALL_BUTTON)}
        >
          <Text
            style={[
              styles.tabActionText,
              tabs.length === 0 ? styles.actionDisabled : null,
            ]}
          >
            {strings('browser.tabs_close_all')}
          </Text>
        </TouchableOpacity>
        <View style={styles.tabAction}>
          <TouchableOpacity
            style={styles.newTabIconButton}
            onPress={this.onNewTabPress}
            {...generateTestId(Platform, MULTI_TAB_ADD_BUTTON)}
          >
            <MaterialCommunityIcon
              name="plus"
              size={15}
              style={styles.newTabIcon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.tabAction, styles.tabActionRight]}
          onPress={closeTabsView}
          {...generateTestId(Platform, MULTI_TAB_DONE_BUTTON)}
        >
          <Text
            style={[
              styles.tabActionText,
              styles.tabActionDone,
              tabs.length === 0 ? styles.actionDisabled : null,
            ]}
          >
            {strings('browser.tabs_done')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  render() {
    const { tabs, activeTab } = this.props;
    const styles = this.getStyles();

    return (
      <View style={styles.tabsView}>
        {tabs.length === 0
          ? this.renderNoTabs()
          : this.renderTabs(tabs, activeTab)}
        {this.renderTabActions()}
      </View>
    );
  }
}

Tabs.contextType = ThemeContext;
