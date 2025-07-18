import PropTypes from 'prop-types';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { captureScreen } from 'react-native-view-shot';
import { connect, useSelector } from 'react-redux';
import { parseCaipAccountId } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { selectPermissionControllerState } from '../../../selectors/snaps';
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
import {
  getPermittedCaipAccountIdsByHostname,
  sortMultichainAccountsByLastSelected,
} from '../../../core/Permissions';
import Logger from '../../../util/Logger';
import getAccountNameWithENS from '../../../util/accounts';
import Tabs from '../../UI/Tabs';
import BrowserTab from '../BrowserTab/BrowserTab';
import URL from 'url-parse';
import { useMetrics } from '../../hooks/useMetrics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  appendURLParams,
  isTokenDiscoveryBrowserEnabled,
} from '../../../util/browser';
import {
  THUMB_WIDTH,
  THUMB_HEIGHT,
  IDLE_TIME_CALC_INTERVAL,
  IDLE_TIME_MAX,
} from './constants';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './styles';
import Routes from '../../../constants/navigation/Routes';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import DiscoveryTab from '../DiscoveryTab/DiscoveryTab';
///: END:ONLY_INCLUDE_IF

const MAX_BROWSER_TABS = 5;

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
  const { accounts, ensByAccountAddress } = useAccounts();
  const [_tabIdleTimes, setTabIdleTimes] = useState({});
  const [shouldShowTabs, setShouldShowTabs] = useState(false);

  const accountAvatarType = useSelector((state) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );
  const isDataCollectionForMarketingEnabled = useSelector(
    (state) => state.security.dataCollectionForMarketing,
  );
  const permittedAccountsList = useSelector(selectPermissionControllerState);

  const homePageUrl = useCallback(
    () =>
      appendURLParams(AppConstants.HOMEPAGE_URL, {
        metricsEnabled: isEnabled(),
        marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
      }).href,
    [isEnabled, isDataCollectionForMarketingEnabled],
  );

  const newTab = useCallback(
    (url, linkType) => {
      // if tabs.length > MAX_BROWSER_TABS, show the max browser tabs modal
      if (tabs.length >= MAX_BROWSER_TABS) {
        navigation.navigate(Routes.MODAL.MAX_BROWSER_TABS_MODAL);
      } else {
        const newTabUrl = isTokenDiscoveryBrowserEnabled()
          ? undefined
          : url || homePageUrl();
        // When a new tab is created, a new tab is rendered, which automatically sets the url source on the webview
        createNewTab(newTabUrl, linkType);
      }
    },
    [tabs, navigation, createNewTab, homePageUrl],
  );

  const [currentUrl, setCurrentUrl] = useState(browserUrl || homePageUrl());

  const updateTabInfo = useCallback(
    (tabID, info) => {
      updateTab(tabID, info);
    },
    [updateTab],
  );

  const hideTabsAndUpdateUrl = (url) => {
    setShouldShowTabs(false);
    setCurrentUrl(url);
  };

  const switchToTab = (tab) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_SWITCH_TAB).build(),
    );
    setActiveTab(tab.id);
    hideTabsAndUpdateUrl(tab.url);
    updateTabInfo(tab.id, {
      url: tab.url,
      isArchived: false,
    });
  };

  const hasAccounts = useRef(Boolean(accounts.length));

  useEffect(() => {
    const interval = setInterval(() => {
      // every so often calc each tab's idle time
      setTabIdleTimes((prevIdleTimes) => {
        const newIdleTimes = { ...prevIdleTimes };
        // for each existing tab
        tabs.forEach((tab) => {
          // if it isn't the active tab
          if (tab.id !== activeTabId) {
            // add idle time for each non-active tab
            newIdleTimes[tab.id] =
              (newIdleTimes[tab.id] || 0) + IDLE_TIME_CALC_INTERVAL;
            // if the tab has surpassed the maximum
            if (newIdleTimes[tab.id] > IDLE_TIME_MAX) {
              // then "archive" it
              updateTab(tab.id, {
                isArchived: true,
              });
            }
          } else {
            // set any active tab as NOT "archived"
            // this can mean "unarchiving" a tab so that, for example,
            // the actual browser tab window is mounted again
            updateTab(tab.id, {
              isArchived: false,
            });
            // also set new tab idle time back to zero
            newIdleTimes[tab.id] = 0;
          }
        });
        return newIdleTimes;
      });
    }, IDLE_TIME_CALC_INTERVAL);

    return () => clearInterval(interval);
  }, [tabs, activeTabId, updateTab]);

  useEffect(() => {
    const checkIfActiveAccountChanged = (hostnameForToastCheck) => {
      const permittedAccounts = getPermittedCaipAccountIdsByHostname(
        permittedAccountsList,
        hostnameForToastCheck,
      );

      const sortedPermittedAccounts =
        sortMultichainAccountsByLastSelected(permittedAccounts);

      if (!sortedPermittedAccounts.length) {
        return;
      }

      const activeCaipAccountId = sortedPermittedAccounts[0];

      const { address } = parseCaipAccountId(activeCaipAccountId);

      const accountName = getAccountNameWithENS({
        caipAccountId: activeCaipAccountId,
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
        accountAddress: address,
        accountAvatarType,
      });
    };

    const urlForEffect = browserUrl || currentUrl;

    if (accounts.length && urlForEffect) {
      const newHostname = new URL(urlForEffect).hostname;
      if (prevSiteHostname.current !== newHostname || !hasAccounts.current) {
        checkIfActiveAccountChanged(newHostname);
      }
      hasAccounts.current = true;
      prevSiteHostname.current = newHostname;
    }
  }, [
    currentUrl,
    browserUrl,
    accounts,
    permittedAccountsList,
    ensByAccountAddress,
    accountAvatarType,
    toastRef,
  ]);

  // componentDidMount
  useEffect(
    () => {
      const newTabUrl = route.params?.newTabUrl;
      const existingTabId = route.params?.existingTabId;
      if (!newTabUrl && !existingTabId) {
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

  const takeScreenshot = useCallback(
    (url, tabID) =>
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
      }),
    [updateTab],
  );

  const showTabsView = useCallback(async () => {
    try {
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      await takeScreenshot(activeTab.url, activeTab.id);
    } catch (e) {
      Logger.error(e);
    }

    setShouldShowTabs(true);
  }, [tabs, activeTabId, takeScreenshot]);

  const closeAllTabs = () => {
    if (tabs.length) {
      triggerCloseAllTabs();
      setCurrentUrl(null);
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
            setCurrentUrl(newTab.url);
          }
        });
      } else {
        setCurrentUrl(null);
      }
    }

    triggerCloseTab(tab.id);
  };

  const closeTabsView = () => {
    if (tabs.length) {
      setShouldShowTabs(false);
    }
  };

  const renderTabList = () => {
    if (shouldShowTabs) {
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

  const renderBrowserTabWindows = useCallback(
    () =>
      tabs
        .filter((tab) => !tab.isArchived)
        .map((tab) => {
          // If the tab is not the active tab, don't render it
          if (activeTabId !== tab.id) return null;

          // If the tab is the active tab, render it
          return tab.url || !isTokenDiscoveryBrowserEnabled() ? (
            <BrowserTab
              key={`tab_${tab.id}`}
              id={tab.id}
              initialUrl={tab.url}
              linkType={tab.linkType}
              updateTabInfo={updateTabInfo}
              showTabs={showTabsView}
              newTab={newTab}
              isInTabsView={shouldShowTabs}
              homePageUrl={homePageUrl()}
            />
          ) : (
            <DiscoveryTab
              key={`tab_${tab.id}`}
              id={tab.id}
              showTabs={showTabsView}
              newTab={newTab}
              updateTabInfo={updateTabInfo}
            />
          );
        }),
    [
      tabs,
      shouldShowTabs,
      newTab,
      homePageUrl,
      updateTabInfo,
      showTabsView,
      activeTabId,
    ],
  );

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
