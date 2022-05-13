import React, { useContext, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { View, Dimensions } from 'react-native';
import PropTypes from 'prop-types';
import {
  createNewTab,
  closeAllTabs,
  closeTab,
  setActiveTab,
  updateTab,
} from '../../../actions/browser';
import Tabs from '../../UI/Tabs';
import { getBrowserViewNavbarOptions } from '../../UI/Navbar';
import { captureScreen } from 'react-native-view-shot';
import Logger from '../../../util/Logger';
import Device from '../../../util/device';
import BrowserTab from '../BrowserTab';
import AppConstants from '../../../core/AppConstants';
import { baseStyles } from '../../../styles/common';
import { DrawerContext } from '../../Nav/Main/MainNavigator';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';

const margin = 16;
const THUMB_WIDTH = Dimensions.get('window').width / 2 - margin * 2;
const THUMB_HEIGHT = Device.isIos() ? THUMB_WIDTH * 1.81 : THUMB_WIDTH * 1.48;

/**
 * Component that wraps all the browser
 * individual tabs and the tabs view
 */
const Browser = (props) => {
  const {
    route,
    navigation,
    createNewTab,
    closeAllTabs: triggerCloseAllTabs,
    closeTab: triggerCloseTab,
    setActiveTab,
    updateTab,
    activeTab: activeTabId,
    tabs,
  } = props;
  const { drawerRef } = useContext(DrawerContext);
  const previousTabs = useRef(null);
  const { colors } = useAppThemeFromContext() || mockTheme;

  useEffect(
    () => {
      navigation.setOptions(
        getBrowserViewNavbarOptions(navigation, route, drawerRef, colors),
      );
    },
    /* eslint-disable-next-line */
    [navigation, route, colors],
  );

  const newTab = (url) => {
    createNewTab(url || AppConstants.HOMEPAGE_URL);
  };

  const updateTabInfo = (url, tabID) =>
    updateTab(tabID, {
      url,
    });

  const hideTabsAndUpdateUrl = (url) => {
    navigation.setParams({
      ...route.params,
      showTabs: false,
      url,
      silent: false,
    });
  };

  const switchToTab = (tab) => {
    setActiveTab(tab.id);
    hideTabsAndUpdateUrl(tab.url);
    updateTabInfo(tab.url, tab.id);
  };

  // componentDidMount
  useEffect(
    () => {
      const currentUrl = route.params?.newTabUrl;
      if (!currentUrl) {
        // Nothing from deeplink, carry on.
        const activeTab = tabs.find((tab) => tab.id === activeTabId);
        if (activeTab) {
          // Resume where last left off.
          switchToTab(activeTab);
        } else {
          /* eslint-disable-next-line */
          if (tabs.length) {
            // Tabs exists but no active set. Show first tab.
            switchToTab(tabs[0]);
          } else {
            // No tabs. Create a new one.
            newTab();
          }
        }
      }
      // Initialize previous tabs. This prevents the next useEffect block from running the first time.
      previousTabs.current = tabs || [];
    },
    /* eslint-disable-next-line */
    [],
  );

  // Detect when new tab is added and switch to it.
  useEffect(
    () => {
      if (previousTabs.current && tabs.length > previousTabs.current.length) {
        // New tab was added.
        const tabToSwitch = tabs[tabs.length - 1];
        switchToTab(tabToSwitch);
      }
      previousTabs.current = tabs;
    },
    /* eslint-disable-next-line */
    [tabs],
  );

  // Handle deeplinks.
  useEffect(
    () => {
      const newTabUrl = route.params?.newTabUrl;
      const deeplinkTimestamp = route.params?.timestamp;
      if (newTabUrl && deeplinkTimestamp) {
        // Open url from deeplink.
        newTab(newTabUrl);
      }
    },
    /* eslint-disable-next-line */
    [route.params?.timestamp, route.params?.newTabUrl],
  );

  const takeScreenshot = (url, tabID) =>
    new Promise((resolve, reject) => {
      captureScreen({
        format: 'jpg',
        quality: 0.2,
        THUMB_WIDTH,
        THUMB_HEIGHT,
      }).then(
        (uri) => {
          updateTab(tabID, {
            url,
            image: uri,
          });
          resolve(true);
        },
        (error) => {
          Logger.error(error, `Error saving tab ${url}`);
          reject(error);
        },
      );
    });

  const showTabs = async () => {
    try {
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      await takeScreenshot(activeTab.url, activeTab.id);
    } catch (e) {
      Logger.error(e);
    }

    navigation.setParams({
      ...route.params,
      showTabs: true,
    });
  };

  const closeAllTabs = () => {
    if (tabs.length) {
      triggerCloseAllTabs();
      navigation.setParams({
        ...route.params,
        url: null,
        silent: true,
      });
    }
  };

  const closeTab = (tab) => {
    // If the tab was selected we have to select
    // the next one, and if there's no next one,
    // we select the previous one.
    if (tab.id === activeTabId) {
      if (tabs.length > 1) {
        tabs.forEach((t, i) => {
          if (t.id === tab.id) {
            let newTab = tabs[i - 1];
            if (tabs[i + 1]) {
              newTab = tabs[i + 1];
            }
            setActiveTab(newTab.id);
            navigation.setParams({
              ...route.params,
              url: newTab.url,
              silent: true,
            });
          }
        });
      } else {
        navigation.setParams({
          ...route.params,
          url: null,
          silent: true,
        });
      }
    }

    triggerCloseTab(tab.id);
  };

  const closeTabsView = () => {
    if (tabs.length) {
      navigation.setParams({
        ...route.params,
        showTabs: false,
        silent: true,
      });
    }
  };

  const renderTabsView = () => {
    const showTabs = route.params?.showTabs;
    if (showTabs) {
      return (
        <Tabs
          tabs={tabs}
          activeTab={activeTabId}
          switchToTab={switchToTab}
          newTab={newTab}
          closeTab={closeTab}
          closeTabsView={closeTabsView}
          closeAllTabs={closeAllTabs}
        />
      );
    }
    return null;
  };

  const renderBrowserTabs = () =>
    tabs.map((tab) => (
      <BrowserTab
        id={tab.id}
        key={`tab_${tab.id}`}
        initialUrl={tab.url || AppConstants.HOMEPAGE_URL}
        updateTabInfo={updateTabInfo}
        showTabs={showTabs}
        newTab={newTab}
      />
    ));

  return (
    <View style={baseStyles.flexGrow} testID={'browser-screen'}>
      {renderBrowserTabs()}
      {renderTabsView()}
    </View>
  );
};

const mapStateToProps = (state) => ({
  tabs: state.browser.tabs,
  activeTab: state.browser.activeTab,
});

const mapDispatchToProps = (dispatch) => ({
  createNewTab: (url) => dispatch(createNewTab(url)),
  closeAllTabs: () => dispatch(closeAllTabs()),
  closeTab: (id) => dispatch(closeTab(id)),
  setActiveTab: (id) => dispatch(setActiveTab(id)),
  updateTab: (id, url) => dispatch(updateTab(id, url)),
});

Browser.propTypes = {
  /**
   * react-navigation object used to switch between screens
   */
  navigation: PropTypes.object,
  /**
   * Function to create a new tab
   */
  createNewTab: PropTypes.func,
  /**
   * Function to close all the existing tabs
   */
  closeAllTabs: PropTypes.func,
  /**
   * Function to close a specific tab
   */
  closeTab: PropTypes.func,
  /**
   * Function to set the active tab
   */
  setActiveTab: PropTypes.func,
  /**
   * Function to set the update the url of a tab
   */
  updateTab: PropTypes.func,
  /**
   * Array of tabs
   */
  tabs: PropTypes.array,
  /**
   * ID of the active tab
   */
  activeTab: PropTypes.number,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
};

export default connect(mapStateToProps, mapDispatchToProps)(Browser);
