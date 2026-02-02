import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  Dimensions,
  InteractionManager,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { fontStyles, colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withMetricsAwareness from '../../hooks/useMetrics/withMetricsAwareness';
import TabThumbnail from './TabThumbnail';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import {
  GRID_GAP,
  GRID_COLUMNS,
  GRID_PADDING,
  THUMB_HEIGHT,
} from './Tabs.constants';

// Calculate visible rows for scroll positioning
const NAVBAR_SIZE = Device.isIphoneX() ? 88 : 64;
const ROWS_VISIBLE = Math.floor(
  (Dimensions.get('window').height - NAVBAR_SIZE - GRID_PADDING) /
    (THUMB_HEIGHT + GRID_GAP),
);
const TABS_VISIBLE = ROWS_VISIBLE * GRID_COLUMNS;

const createStyles = (colors) =>
  StyleSheet.create({
    noTabs: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 16,
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
    tabsView: {
      flex: 1,
      backgroundColor: colors.background.default,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.default,
    },
    topBarTitle: {
      flex: 1,
      textAlign: 'center',
    },
    tabs: {
      flex: 1,
      backgroundColor: colors.background.alternative,
    },
    tabsContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: GRID_PADDING,
      gap: GRID_GAP,
      backgroundColor: importedColors.transparent,
    },
  });

/**
 * PureComponent that wraps all the thumbnails
 * representing all the open tabs
 */
class Tabs extends PureComponent {
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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
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

      // Calculate the row (2 columns per row in grid layout)
      const row = Math.floor(index / GRID_COLUMNS);

      // Scroll if needed (account for grid gap between rows)
      const pos = row * (THUMB_HEIGHT + GRID_GAP);

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
    return createStyles(colors);
  };

  renderNoTabs() {
    const styles = this.getStyles();

    return (
      <View style={styles.noTabs}>
        <Text
          style={styles.noTabsTitle}
          testID={BrowserViewSelectorsIDs.NO_TABS_MESSAGE}
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
        testID={BrowserViewSelectorsIDs.TABS_COMPONENT}
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
    const { tabs, newTab, closeTabsView } = this.props;
    newTab(); // No URL = opens empty DiscoveryTab
    this.trackNewTabEvent(tabs.length);
    closeTabsView(); // Dismiss tabs view after creating new tab
  };

  trackNewTabEvent = (tabsNumber) => {
    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.BROWSER_NEW_TAB)
        .addProperties({
          option_chosen: 'Tabs View Top Bar',
          number_of_tabs: tabsNumber,
        })
        .build(),
    );
  };

  renderTopBar() {
    const { closeTabsView } = this.props;
    const styles = this.getStyles();

    return (
      <View style={styles.topBar}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSizes.Lg}
          onPress={closeTabsView}
          testID={BrowserViewSelectorsIDs.TABS_BACK_BUTTON}
          accessibilityLabel={strings('browser.back')}
        />
        <Text variant={TextVariant.HeadingMD} style={styles.topBarTitle}>
          {strings('browser.opened_tabs')}
        </Text>
        <ButtonIcon
          iconName={IconName.Add}
          size={ButtonIconSizes.Lg}
          onPress={this.onNewTabPress}
          testID={BrowserViewSelectorsIDs.ADD_NEW_TAB}
          accessibilityLabel={strings('browser.add_new_tab')}
        />
      </View>
    );
  }

  render() {
    const { tabs, activeTab } = this.props;
    const styles = this.getStyles();

    return (
      <SafeAreaInsetsContext.Consumer>
        {(insets) => (
          <View style={{ ...styles.tabsView, paddingTop: insets.top }}>
            {this.renderTopBar()}
            {tabs.length === 0
              ? this.renderNoTabs()
              : this.renderTabs(tabs, activeTab)}
          </View>
        )}
      </SafeAreaInsetsContext.Consumer>
    );
  }
}

Tabs.contextType = ThemeContext;

export default withMetricsAwareness(Tabs);
