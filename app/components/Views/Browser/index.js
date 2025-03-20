import PropTypes from 'prop-types';
import React, { useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import { connect, useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import {
  closeAllTabs,
  closeTab,
  createNewTab,
  setActiveTab,
  updateTab,
} from '../../../actions/browser';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useAccounts } from '../../hooks/useAccounts';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AppConstants from '../../../core/AppConstants';
import { getPermittedAccounts } from '../../../core/Permissions';
import Logger from '../../../util/Logger';
import getAccountNameWithENS from '../../../util/accounts';
import Tabs from '../../UI/Tabs';
import BrowserTab from '../BrowserTab/BrowserTab';
import URL from 'url-parse';
import { useMetrics } from '../../hooks/useMetrics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appendURLParams } from '../../../util/browser';
import { THUMB_WIDTH, THUMB_HEIGHT } from './constants';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './styles';
import Routes from '../../../constants/navigation/Routes';

const MAX_BROWSER_TABS = 5;
const IDLE_TIME_MAX = 1000 * 30; // 30 seconds
const IDLE_TIME_CALC_INTERVAL = 1000 * 30; // 30 seconds

/**
 * Component that wraps all the browser
 * individual tabs and the tabs view
 */
export const Browser = (props) => {
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
  const previousTabs = useRef(null);
  const { top: topInset } = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { topInset });
  const { trackEvent, createEventBuilder, isEnabled } = useMetrics();
  const { toastRef } = useContext(ToastContext);
  const browserUrl = props.route?.params?.url;
  const linkType = props.route?.params?.linkType;
  const prevSiteHostname = useRef(browserUrl);
  const { evmAccounts: accounts, ensByAccountAddress } = useAccounts();
  const accountAvatarType = useSelector((state) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const isDataCollectionForMarketingEnabled = useSelector(
    (state) => state.security.dataCollectionForMarketing,
  );

  const homePageUrl = () =>
    appendURLParams(AppConstants.HOMEPAGE_URL, {
      metricsEnabled: isEnabled(),
      marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
    }).href;

  const newTab = (url, linkType) => {
    Logger.log('[BROWSER] Creating a new tab');
    if (tabs.length >= MAX_BROWSER_TABS) {
      Logger.log('[BROWSER] Max browser tabs reached');
      navigation.navigate(Routes.MODAL.MAX_BROWSER_TABS_MODAL);
    } else {
      createNewTab(url || homePageUrl(), linkType);
    }
  };

  const updateTabInfo = (tabID, info) => {
    Logger.log(`[BROWSER] Updating tab info for tab ID: ${tabID} to ${JSON.stringify(info)}`);
    updateTab(tabID, info);
  };

  const hideTabsAndUpdateUrl = (url) => {
    navigation.setParams({
      ...route.params,
      showTabs: false,
      url,
    });
  };

  const switchToTab = (tab) => {
    Logger.log(`[BROWSER] Switching to tab with ID: ${tab.id}`);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_SWITCH_TAB).build(),
    );
    hideTabsAndUpdateUrl(tab.url);
    updateTabInfo(tab.id, {
      url: tab.url,
      isArchived: false,
    });
    setTimeout(() => setActiveTab(tab.id), 5);
  };

  const hasAccounts = useRef(Boolean(accounts.length));

  const [tabIdleTimes, setTabIdleTimes] = React.useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setTabIdleTimes((prevIdleTimes) => {
        const newIdleTimes = { ...prevIdleTimes };
        tabs.forEach((tab) => {
          if (tab.id !== activeTabId) {
            newIdleTimes[tab.id] = (newIdleTimes[tab.id] || 0) + IDLE_TIME_CALC_INTERVAL; // Increment by 10 seconds
            if (newIdleTimes[tab.id] > IDLE_TIME_MAX) {
              Logger.log(`[BROWSER *********] Tab URL ${tab.url} has been idle for more than ${IDLE_TIME_MAX} ms`);
              updateTab(tab.id, {
                isArchived: true,
              });
            }
          } else {
            updateTab(tab.id, {
              isArchived: false,
            });
            newIdleTimes[tab.id] = 0; // Reset idle time for active tab
          }
        });
        return newIdleTimes;
      });
    }, IDLE_TIME_CALC_INTERVAL);

    return () => clearInterval(interval);
  }, [tabs, activeTabId, updateTab]);

  useEffect(() => {
    Logger.log('[BROWSER] Checking if active account changed');
    const checkIfActiveAccountChanged = async () => {
      const hostname = new URL(browserUrl).hostname;
      const permittedAccounts = await getPermittedAccounts(hostname);
      const activeAccountAddress = permittedAccounts?.[0];

      if (activeAccountAddress) {
        const accountName = getAccountNameWithENS({
          accountAddress: activeAccountAddress,
          accounts,
          ensByAccountAddress,
        });
        // Show active account toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Account,
          labelOptions: [
            {
              label: `${accountName} `,
              isBold: true,
            },
            { label: strings('toast.now_active') },
          ],
          accountAddress: activeAccountAddress,
          accountAvatarType,
        });
      }
    };

    // Handle when the Browser initially mounts and when url changes.
    if (accounts.length && browserUrl) {
      const hostname = new URL(browserUrl).hostname;
      if (prevSiteHostname.current !== hostname || !hasAccounts.current) {
        checkIfActiveAccountChanged();
      }
      hasAccounts.current = true;
      prevSiteHostname.current = hostname;
    }
  }, [browserUrl, accounts, ensByAccountAddress, accountAvatarType, toastRef]);

  // componentDidMount
  useEffect(
    () => {
      Logger.log('[BROWSER] Component did mount');
      const currentUrl = route.params?.newTabUrl;
      const existingTabId = route.params?.existingTabId;
      if (!currentUrl && !existingTabId) {
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
      Logger.log('[BROWSER] Detecting new tab addition');
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

  // Handle links with associated timestamp.
  useEffect(
    () => {
      const newTabUrl = route.params?.newTabUrl;
      const deeplinkTimestamp = route.params?.timestamp;
      const existingTabId = route.params?.existingTabId;
      if (newTabUrl && deeplinkTimestamp) {
        // Open url from link.
        newTab(newTabUrl, linkType);
      } else if (existingTabId) {
        const existingTab = tabs.find((tab) => tab.id === existingTabId);
        if (existingTab) {
          switchToTab(existingTab);
        }
      }
    },
    /* eslint-disable-next-line */
    [
      route.params?.timestamp,
      route.params?.newTabUrl,
      route.params?.existingTabId,
    ],
  );

  const takeScreenshot = (url, tabID) => {
    Logger.log(`[BROWSER] Taking screenshot for tab ID: ${tabID}`);
    return new Promise((resolve, reject) => {
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
  };

  const showTabs = async () => {
    Logger.log('[BROWSER] Showing tabs');
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
    Logger.log('[BROWSER] Closing all tabs');
    if (tabs.length) {
      triggerCloseAllTabs();
      navigation.setParams({
        ...route.params,
        url: null,
      });
    }
  };

  const closeTab = (tab) => {
    Logger.log(`[BROWSER] Closing tab with ID: ${tab.id}`);
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
            });
          }
        });
      } else {
        navigation.setParams({
          ...route.params,
          url: null,
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
      });
    }
  };

  const renderTabList = () => {
    Logger.log('[BROWSER] Rendering tabs view');
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

  const renderBrowserTabWindows = () => {
    Logger.log('[BROWSER] Rendering browser tabs');
    return tabs.filter((tab) => !tab.isArchived).map((tab) => (
      <BrowserTab
        id={tab.id}
        key={`tab_${tab.id}`}
        initialUrl={tab.url}
        linkType={tab.linkType}
        updateTabInfo={updateTabInfo}
        showTabs={showTabs}
        newTab={newTab}
        isInTabsView={route.params?.showTabs}
        homePageUrl={homePageUrl()}
      />
    ));
  };

  return (
    <View
      style={styles.browserContainer}
      testID={BrowserViewSelectorsIDs.BROWSER_SCREEN_ID}
    >
      {renderBrowserTabWindows()}
      {renderTabList()}
    </View>
  );
};

const mapStateToProps = (state) => ({
  tabs: state.browser.tabs,
  activeTab: state.browser.activeTab,
});

const mapDispatchToProps = (dispatch) => ({
  createNewTab: (url, linkType) => dispatch(createNewTab(url, linkType)),
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

export { default as createBrowserNavDetails } from './Browser.types';

export default connect(mapStateToProps, mapDispatchToProps)(Browser);
