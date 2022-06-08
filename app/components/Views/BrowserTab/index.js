import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Alert,
  Linking,
  BackHandler,
  InteractionManager,
} from 'react-native';
import { withNavigation } from '@react-navigation/compat';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import PropTypes from 'prop-types';
import Share from 'react-native-share';
import { connect } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge';
import Engine from '../../../core/Engine';
import PhishingModal from '../../UI/PhishingModal';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import {
  baseStyles,
  fontStyles,
  colors as importedColors,
} from '../../../styles/common';
import Logger from '../../../util/Logger';
import onUrlSubmit, { getHost, getUrlObj } from '../../../util/browser';
import {
  SPA_urlChangeListener,
  JS_DESELECT_TEXT,
  JS_WEBVIEW_URL,
} from '../../../util/browserScripts';
import resolveEnsToIpfsContentId from '../../../lib/ens-ipfs/resolver';
import Button from '../../UI/Button';
import { strings } from '../../../../locales/i18n';
import URL from 'url-parse';
import Modal from 'react-native-modal';
import WebviewError from '../../UI/WebviewError';
import { approveHost } from '../../../actions/privacy';
import { addBookmark } from '../../../actions/bookmarks';
import { addToHistory, addToWhitelist } from '../../../actions/browser';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import SearchApi from 'react-native-search-api';
import Analytics from '../../../core/Analytics/Analytics';
import AnalyticsV2, { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { toggleNetworkModal } from '../../../actions/modals';
import setOnboardingWizardStep from '../../../actions/wizard';
import OnboardingWizard from '../../UI/OnboardingWizard';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import ErrorBoundary from '../ErrorBoundary';

import { getRpcMethodMiddleware } from '../../../core/RPCMethods/RPCMethodMiddleware';
import { useAppThemeFromContext, mockTheme } from '../../../util/theme';
import downloadFile from '../../../util/browser/downloadFile';
import { createBrowserUrlModalNavDetails } from '../BrowserUrlModal/BrowserUrlModal';

const { HOMEPAGE_URL, USER_AGENT, NOTIFICATION_NAMES } = AppConstants;
const HOMEPAGE_HOST = new URL(HOMEPAGE_URL)?.hostname;
const MM_MIXPANEL_TOKEN = process.env.MM_MIXPANEL_TOKEN;

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      ...baseStyles.flexGrow,
      backgroundColor: colors.background.default,
    },
    hide: {
      flex: 0,
      opacity: 0,
      display: 'none',
      width: 0,
      height: 0,
    },
    progressBarWrapper: {
      height: 3,
      width: '100%',
      left: 0,
      right: 0,
      top: 0,
      position: 'absolute',
      zIndex: 999999,
    },
    optionsOverlay: {
      position: 'absolute',
      zIndex: 99999998,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    optionsWrapper: {
      position: 'absolute',
      zIndex: 99999999,
      width: 200,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
      borderRadius: 10,
      paddingBottom: 5,
      paddingTop: 10,
    },
    optionsWrapperAndroid: {
      shadowColor: importedColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
      bottom: 65,
      right: 5,
    },
    optionsWrapperIos: {
      shadowColor: importedColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 3,
      bottom: 90,
      right: 5,
    },
    option: {
      paddingVertical: 10,
      height: 'auto',
      minHeight: 44,
      paddingHorizontal: 15,
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: Device.isAndroid() ? 0 : -5,
    },
    optionText: {
      fontSize: 16,
      lineHeight: 16,
      alignSelf: 'center',
      justifyContent: 'center',
      marginTop: 3,
      color: colors.primary.default,
      flex: 1,
      ...fontStyles.fontPrimary,
    },
    optionIconWrapper: {
      flex: 0,
      borderRadius: 5,
      backgroundColor: colors.primary.muted,
      padding: 3,
      marginRight: 10,
      alignSelf: 'center',
    },
    optionIcon: {
      color: colors.primary.default,
      textAlign: 'center',
      alignSelf: 'center',
      fontSize: 18,
    },
    webview: {
      ...baseStyles.flexGrow,
      zIndex: 1,
    },
    urlModalContent: {
      flexDirection: 'row',
      paddingTop: Device.isAndroid() ? 10 : Device.isIphoneX() ? 50 : 27,
      paddingHorizontal: 10,
      height: Device.isAndroid() ? 59 : Device.isIphoneX() ? 87 : 65,
      backgroundColor: colors.background.default,
    },
    searchWrapper: {
      flexDirection: 'row',
      borderRadius: 30,
      backgroundColor: colors.background.alternative,
      height: Device.isAndroid() ? 40 : 30,
      flex: 1,
    },
    clearButton: { paddingHorizontal: 12, justifyContent: 'center' },
    urlModal: {
      justifyContent: 'flex-start',
      margin: 0,
    },
    urlInput: {
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      paddingLeft: 15,
      flex: 1,
      color: colors.text.default,
    },
    cancelButton: {
      marginTop: -6,
      marginLeft: 10,
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    fullScreenModal: {
      flex: 1,
    },
  });

const sessionENSNames = {};
const ensIgnoreList = [];
let approvedHosts = {};

const getApprovedHosts = () => approvedHosts;
const setApprovedHosts = (hosts) => {
  approvedHosts = hosts;
};

export const BrowserTab = (props) => {
  const [backEnabled, setBackEnabled] = useState(false);
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [initialUrl, setInitialUrl] = useState('');
  const [firstUrlLoaded, setFirstUrlLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState(null);
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState(undefined);

  const webviewRef = useRef(null);

  const url = useRef('');
  const title = useRef('');
  const icon = useRef(null);
  const webviewUrlPostMessagePromiseResolve = useRef(null);
  const backgroundBridges = useRef([]);
  const fromHomepage = useRef(false);
  const wizardScrollAdjusted = useRef(false);

  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  /**
   * Is the current tab the active tab
   */
  const isTabActive = useCallback(
    () => props.activeTab === props.id,
    [props.activeTab, props.id],
  );

  /**
   * Gets the url to be displayed to the user
   * For example, if it's ens then show [site].eth instead of ipfs url
   */
  const getMaskedUrl = (url) => {
    if (!url) return url;
    let replace = null;
    if (url.startsWith(AppConstants.IPFS_DEFAULT_GATEWAY_URL)) {
      replace = (key) =>
        `${AppConstants.IPFS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hash}/`;
    } else if (url.startsWith(AppConstants.IPNS_DEFAULT_GATEWAY_URL)) {
      replace = (key) =>
        `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hostname}/`;
    } else if (url.startsWith(AppConstants.SWARM_DEFAULT_GATEWAY_URL)) {
      replace = (key) =>
        `${AppConstants.SWARM_GATEWAY_URL}${sessionENSNames[key].hash}/`;
    }

    if (replace) {
      const key = Object.keys(sessionENSNames).find((ens) =>
        url.startsWith(ens),
      );
      if (key) {
        url = url.replace(
          replace(key),
          `https://${sessionENSNames[key].hostname}/`,
        );
      }
    }
    return url;
  };

  /**
   * Checks if it is a ENS website
   */
  const isENSUrl = (url) => {
    const { hostname } = new URL(url);
    const tld = hostname.split('.').pop();
    if (AppConstants.supportedTLDs.indexOf(tld.toLowerCase()) !== -1) {
      // Make sure it's not in the ignore list
      if (ensIgnoreList.indexOf(hostname) === -1) {
        return true;
      }
    }
    return false;
  };

  /**
   * Checks if a given url or the current url is the homepage
   */
  const isHomepage = useCallback((checkUrl = null) => {
    const currentPage = checkUrl || url.current;
    const { host: currentHost } = getUrlObj(currentPage);
    return currentHost === HOMEPAGE_HOST;
  }, []);

  const notifyAllConnections = useCallback(
    (payload, restricted = true) => {
      const fullHostname = new URL(url.current).hostname;

      // TODO:permissions move permissioning logic elsewhere
      backgroundBridges.current.forEach((bridge) => {
        if (
          bridge.hostname === fullHostname &&
          (!props.privacyMode || !restricted || approvedHosts[bridge.hostname])
        ) {
          bridge.sendNotification(payload);
        }
      });
    },
    [props.privacyMode],
  );

  /**
   * Manage hosts that were approved to connect with the user accounts
   */
  useEffect(() => {
    const { approvedHosts: approvedHostsProps, selectedAddress } = props;

    approvedHosts = approvedHostsProps;

    const numApprovedHosts = Object.keys(approvedHosts).length;

    // this will happen if the approved hosts were cleared
    if (numApprovedHosts === 0) {
      notifyAllConnections(
        {
          method: NOTIFICATION_NAMES.accountsChanged,
          params: [],
        },
        false,
      ); // notification should be sent regardless of approval status
    }

    if (numApprovedHosts > 0) {
      notifyAllConnections({
        method: NOTIFICATION_NAMES.accountsChanged,
        params: [selectedAddress],
      });
    }
  }, [notifyAllConnections, props, props.approvedHosts, props.selectedAddress]);

  /**
   * Dismiss the text selection on the current website
   */
  const dismissTextSelectionIfNeeded = useCallback(() => {
    if (isTabActive() && Device.isAndroid()) {
      const { current } = webviewRef;
      if (current) {
        setTimeout(() => {
          current.injectJavaScript(JS_DESELECT_TEXT);
        }, 50);
      }
    }
  }, [isTabActive]);

  /**
   * Toggle the options menu
   */
  const toggleOptions = useCallback(() => {
    dismissTextSelectionIfNeeded();
    setShowOptions(!showOptions);
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_BROWSER_OPTIONS);
    });
  }, [dismissTextSelectionIfNeeded, showOptions]);

  /**
   * Show the options menu
   */
  const toggleOptionsIfNeeded = useCallback(() => {
    if (showOptions) {
      toggleOptions();
    }
  }, [showOptions, toggleOptions]);

  /**
   * Go back to previous website in history
   */
  const goBack = useCallback(() => {
    if (!backEnabled) return;

    toggleOptionsIfNeeded();
    const { current } = webviewRef;
    current && current.goBack();
  }, [backEnabled, toggleOptionsIfNeeded]);

  /**
   * Go forward to the next website in history
   */
  const goForward = async () => {
    if (!forwardEnabled) return;

    toggleOptionsIfNeeded();
    const { current } = webviewRef;
    current && current.goForward && current.goForward();
  };

  /**
   * Check if a hostname is allowed
   */
  const isAllowedUrl = useCallback(
    (hostname) => {
      const { PhishingController } = Engine.context;
      return (
        (props.whitelist && props.whitelist.includes(hostname)) ||
        !PhishingController.test(hostname)
      );
    },
    [props.whitelist],
  );

  const isBookmark = () => {
    const { bookmarks } = props;
    const maskedUrl = getMaskedUrl(url.current);
    return bookmarks.some(({ url: bookmark }) => bookmark === maskedUrl);
  };

  /**
   * Show a phishing modal when a url is not allowed
   */
  const handleNotAllowedUrl = (urlToGo) => {
    setBlockedUrl(urlToGo);
    setTimeout(() => setShowPhishingModal(true), 1000);
  };

  /**
   * Get IPFS info from a ens url
   */
  const handleIpfsContent = useCallback(
    async (fullUrl, { hostname, pathname, query }) => {
      const { provider } = Engine.context.NetworkController;
      let gatewayUrl;
      try {
        const { type, hash } = await resolveEnsToIpfsContentId({
          provider,
          name: hostname,
        });
        if (type === 'ipfs-ns') {
          gatewayUrl = `${props.ipfsGateway}${hash}${pathname || '/'}${
            query || ''
          }`;
          const response = await fetch(gatewayUrl);
          const statusCode = response.status;
          if (statusCode >= 400) {
            Logger.log('Status code ', statusCode, gatewayUrl);
            //urlNotFound(gatewayUrl);
            return null;
          }
        } else if (type === 'swarm-ns') {
          gatewayUrl = `${AppConstants.SWARM_DEFAULT_GATEWAY_URL}${hash}${
            pathname || '/'
          }${query || ''}`;
        } else if (type === 'ipns-ns') {
          gatewayUrl = `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${hostname}${
            pathname || '/'
          }${query || ''}`;
        }
        return {
          url: gatewayUrl,
          hash,
          type,
        };
      } catch (err) {
        // This is a TLD that might be a normal website
        // For example .XYZ and might be more in the future
        if (
          hostname.substr(-4) !== '.eth' &&
          err.toString().indexOf('is not standard') !== -1
        ) {
          ensIgnoreList.push(hostname);
          return { url: fullUrl, reload: true };
        }
        if (
          err?.message?.startsWith(
            'EnsIpfsResolver - no known ens-ipfs registry for chainId',
          )
        ) {
          trackErrorAsAnalytics(
            'Browser: Failed to resolve ENS name for chainId',
            err?.message,
          );
        } else {
          Logger.error(err, 'Failed to resolve ENS name');
        }

        Alert.alert(strings('browser.failed_to_resolve_ens_name'), err.message);
        goBack();
      }
    },
    [goBack, props.ipfsGateway],
  );

  /**
   * Go to a url
   */
  const go = useCallback(
    async (url, initialCall) => {
      const hasProtocol = url.match(/^[a-z]*:\/\//) || isHomepage(url);
      const sanitizedURL = hasProtocol ? url : `${props.defaultProtocol}${url}`;
      const { hostname, query, pathname } = new URL(sanitizedURL);

      let urlToGo = sanitizedURL;
      const isEnsUrl = isENSUrl(url);
      const { current } = webviewRef;
      if (isEnsUrl) {
        current && current.stopLoading();
        const {
          url: ensUrl,
          type,
          hash,
          reload,
        } = await handleIpfsContent(url, { hostname, query, pathname });
        if (reload) return go(ensUrl);
        urlToGo = ensUrl;
        sessionENSNames[urlToGo] = { hostname, hash, type };
      }

      if (isAllowedUrl(hostname)) {
        if (initialCall || !firstUrlLoaded) {
          setInitialUrl(urlToGo);
          setFirstUrlLoaded(true);
        } else {
          current &&
            current.injectJavaScript(
              `(function(){window.location.href = '${urlToGo}' })()`,
            );
        }

        setProgress(0);
        return sanitizedURL;
      }
      handleNotAllowedUrl(urlToGo);
      return null;
    },
    [
      firstUrlLoaded,
      handleIpfsContent,
      isAllowedUrl,
      isHomepage,
      props.defaultProtocol,
    ],
  );

  /**
   * Open a new tab
   */
  const openNewTab = useCallback(
    (url) => {
      toggleOptionsIfNeeded();
      dismissTextSelectionIfNeeded();
      props.newTab(url);
    },
    [dismissTextSelectionIfNeeded, props, toggleOptionsIfNeeded],
  );

  /**
   * Reload current page
   */
  const reload = useCallback(() => {
    const { current } = webviewRef;
    current && current.reload();
  }, []);

  /**
   * Handle when the drawer (app menu) is opened
   */
  const drawerOpenHandler = useCallback(() => {
    dismissTextSelectionIfNeeded();
  }, [dismissTextSelectionIfNeeded]);

  /**
   * Set initial url, dapp scripts and engine. Similar to componentDidMount
   */
  useEffect(() => {
    approvedHosts = props.approvedHosts;
    const initialUrl = props.initialUrl || HOMEPAGE_URL;
    go(initialUrl, true);

    const getEntryScriptWeb3 = async () => {
      const entryScriptWeb3 = await EntryScriptWeb3.get();
      setEntryScriptWeb3(entryScriptWeb3 + SPA_urlChangeListener);
    };

    getEntryScriptWeb3();

    // Specify how to clean up after this effect:
    return function cleanup() {
      backgroundBridges.current.forEach((bridge) => bridge.onDisconnect());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Device.isAndroid()) {
      DrawerStatusTracker.hub.on('drawer::open', drawerOpenHandler);
    }

    return function cleanup() {
      if (Device.isAndroid()) {
        DrawerStatusTracker &&
          DrawerStatusTracker.hub &&
          DrawerStatusTracker.hub.removeListener(
            'drawer::open',
            drawerOpenHandler,
          );
      }
    };
  }, [drawerOpenHandler]);

  /**
   * Set navigation listeners
   */
  useEffect(() => {
    const handleAndroidBackPress = () => {
      if (!isTabActive()) return false;
      goBack();
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);

    // Handle hardwareBackPress event only for browser, not components rendered on top
    props.navigation.addListener('willFocus', () => {
      BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);
    });
    props.navigation.addListener('willBlur', () => {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        handleAndroidBackPress,
      );
    });

    return function cleanup() {
      BackHandler.removeEventListener(
        'hardwareBackPress',
        handleAndroidBackPress,
      );
    };
  }, [goBack, isTabActive, props.navigation]);

  /**
   * Inject home page scripts to get the favourites and set analytics key
   */
  const injectHomePageScripts = async (bookmarks) => {
    const { current } = webviewRef;
    const analyticsEnabled = Analytics.checkEnabled();
    const disctinctId = await Analytics.getDistinctId();
    const homepageScripts = `
			window.__mmFavorites = ${JSON.stringify(bookmarks || props.bookmarks)};
			window.__mmSearchEngine = "${props.searchEngine}";
			window.__mmMetametrics = ${analyticsEnabled};
			window.__mmDistinctId = "${disctinctId}";
			window.__mmMixpanelToken = "${MM_MIXPANEL_TOKEN}";
			(function () {
				try {
					window.dispatchEvent(new Event('metamask_onHomepageScriptsInjected'));
				} catch (e) {
					//Nothing to do
				}
			})()
		`;

    current.injectJavaScript(homepageScripts);
  };

  /**
   * Handles state changes for when the url changes
   */
  const changeUrl = (siteInfo) => {
    url.current = siteInfo.url;
    title.current = siteInfo.title;
    if (siteInfo.icon) icon.current = siteInfo.icon;
  };

  /**
   * Handles state changes for when the url changes
   */
  const changeAddressBar = (siteInfo) => {
    setBackEnabled(siteInfo.canGoBack);
    setForwardEnabled(siteInfo.canGoForward);

    isTabActive() &&
      props.navigation.setParams({
        url: getMaskedUrl(siteInfo.url),
        icon: siteInfo.icon,
        silent: true,
      });

    props.updateTabInfo(getMaskedUrl(siteInfo.url), props.id);

    props.addToBrowserHistory({
      name: siteInfo.title,
      url: getMaskedUrl(siteInfo.url),
    });
  };

  /**
   * Go to eth-phishing-detect page
   */
  const goToETHPhishingDetector = () => {
    setShowPhishingModal(false);
    go(`https://github.com/metamask/eth-phishing-detect`);
  };

  /**
   * Continue to phishing website
   */
  const continueToPhishingSite = () => {
    const urlObj = new URL(blockedUrl);
    props.addToWhitelist(urlObj.hostname);
    setShowPhishingModal(false);
    blockedUrl !== url.current &&
      setTimeout(() => {
        go(blockedUrl);
        setBlockedUrl(undefined);
      }, 1000);
  };

  /**
   * Go to etherscam website
   */
  const goToEtherscam = () => {
    setShowPhishingModal(false);
    go(`https://etherscamdb.info/domain/meta-mask.com`);
  };

  /**
   * Go to eth-phishing-detect issue
   */
  const goToFilePhishingIssue = () => {
    setShowPhishingModal(false);
    go(`https://github.com/metamask/eth-phishing-detect/issues/new`);
  };

  /**
   * Go back from phishing website alert
   */
  const goBackToSafety = () => {
    blockedUrl === url.current && goBack();
    setTimeout(() => {
      setShowPhishingModal(false);
      setBlockedUrl(undefined);
    }, 500);
  };

  /**
   * Renders the phishing modal
   */
  const renderPhishingModal = () => (
    <Modal
      isVisible={showPhishingModal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.fullScreenModal}
      backdropOpacity={1}
      backdropColor={colors.error.default}
      animationInTiming={300}
      animationOutTiming={300}
      useNativeDriver
    >
      <PhishingModal
        fullUrl={blockedUrl}
        goToETHPhishingDetector={goToETHPhishingDetector}
        continueToPhishingSite={continueToPhishingSite}
        goToEtherscam={goToEtherscam}
        goToFilePhishingIssue={goToFilePhishingIssue}
        goBackToSafety={goBackToSafety}
      />
    </Modal>
  );

  const trackEventSearchUsed = useCallback(() => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_SEARCH_USED, {
      option_chosen: 'Search on URL',
      number_of_tabs: undefined,
    });
  }, []);

  /**
   * Stops normal loading when it's ens, instead call go to be properly set up
   */
  const onShouldStartLoadWithRequest = ({ url }) => {
    if (isENSUrl(url)) {
      go(url.replace(/^http:\/\//, 'https://'));
      return false;
    }
    return true;
  };

  /**
   * Sets loading bar progress
   */
  const onLoadProgress = ({ nativeEvent: { progress } }) => {
    setProgress(progress);
  };

  const onLoad = ({ nativeEvent }) => {
    //For iOS url on the navigation bar should only update upon load.
    if (Device.isIos()) {
      changeUrl(nativeEvent);
      changeAddressBar(nativeEvent);
    }
  };

  /**
   * When website finished loading
   */
  const onLoadEnd = ({ nativeEvent }) => {
    if (nativeEvent.loading) return;
    const { current } = webviewRef;

    current && current.injectJavaScript(JS_WEBVIEW_URL);

    const promiseResolver = (resolve) => {
      webviewUrlPostMessagePromiseResolve.current = resolve;
    };
    const promise = current
      ? new Promise(promiseResolver)
      : Promise.resolve(url.current);

    promise.then((info) => {
      const { hostname: currentHostname } = new URL(url.current);
      const { hostname } = new URL(nativeEvent.url);
      if (info.url === nativeEvent.url && currentHostname === hostname) {
        changeUrl({ ...nativeEvent, icon: info.icon });
        changeAddressBar({ ...nativeEvent, icon: info.icon });
      }
    });
  };

  /**
   * Handle message from website
   */
  const onMessage = ({ nativeEvent }) => {
    let data = nativeEvent.data;
    try {
      data = typeof data === 'string' ? JSON.parse(data) : data;
      if (!data || (!data.type && !data.name)) {
        return;
      }
      if (data.name) {
        backgroundBridges.current.forEach((bridge) => {
          if (bridge.isMainFrame) {
            const { origin } = data && data.origin && new URL(data.origin);
            bridge.url === origin && bridge.onMessage(data);
          } else {
            bridge.url === data.origin && bridge.onMessage(data);
          }
        });
        return;
      }

      switch (data.type) {
        /**
				* Disabling iframes for now
				case 'FRAME_READY': {
					const { url } = data.payload;
					onFrameLoadStarted(url);
					break;
				}*/
        case 'GET_WEBVIEW_URL': {
          const { url } = data.payload;
          if (url === nativeEvent.url)
            webviewUrlPostMessagePromiseResolve.current &&
              webviewUrlPostMessagePromiseResolve.current(data.payload);
        }
      }
    } catch (e) {
      Logger.error(e, `Browser::onMessage on ${url.current}`);
    }
  };

  /**
   * Go to home page, reload if already on homepage
   */
  const goToHomepage = async () => {
    toggleOptionsIfNeeded();
    if (url.current === HOMEPAGE_URL) return reload();
    await go(HOMEPAGE_URL);
    Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_HOME);
  };

  /**
   * Handle url input submit
   */
  const onUrlInputSubmit = useCallback(
    async (inputValue = undefined) => {
      trackEventSearchUsed();
      if (!inputValue) {
        return;
      }
      const { defaultProtocol, searchEngine } = props;
      const sanitizedInput = onUrlSubmit(
        inputValue,
        searchEngine,
        defaultProtocol,
      );
      await go(sanitizedInput);
    },
    /* we do not want to depend on the props object
		- since we are changing it here, this would give us a circular dependency and infinite re renders
		*/
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /**
   * Shows or hides the url input modal.
   * When opened it sets the current website url on the input.
   */
  const toggleUrlModal = useCallback(
    (shouldClearInput = false) => {
      const urlToShow = shouldClearInput ? '' : getMaskedUrl(url.current);
      props.navigation.navigate(
        ...createBrowserUrlModalNavDetails({
          url: urlToShow,
          onUrlInputSubmit,
        }),
      );
    },
    /* we do not want to depend on the props.navigation object
		- since we are changing it here, this would give us a circular dependency and infinite re renders
		*/
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUrlInputSubmit],
  );

  const initializeBackgroundBridge = (urlBridge, isMainFrame) => {
    const newBridge = new BackgroundBridge({
      webview: webviewRef,
      url: urlBridge,
      getRpcMethodMiddleware: ({ hostname, getProviderState }) =>
        getRpcMethodMiddleware({
          hostname,
          getProviderState,
          navigation: props.navigation,
          getApprovedHosts,
          setApprovedHosts,
          approveHost: props.approveHost,
          // Website info
          url,
          title,
          icon,
          // Bookmarks
          isHomepage,
          // Show autocomplete
          fromHomepage,
          toggleUrlModal,
          // Wizard
          wizardScrollAdjusted,
          tabId: props.id,
          injectHomePageScripts,
        }),
      isMainFrame,
    });
    backgroundBridges.current.push(newBridge);
  };

  /**
   * Website started to load
   */
  const onLoadStart = async ({ nativeEvent }) => {
    const { hostname } = new URL(nativeEvent.url);

    if (nativeEvent.url !== url.current) {
      changeAddressBar({ ...nativeEvent });
    }

    if (!isAllowedUrl(hostname)) {
      return handleNotAllowedUrl(nativeEvent.url);
    }
    webviewUrlPostMessagePromiseResolve.current = null;
    setError(false);

    changeUrl(nativeEvent, 'start');

    //For Android url on the navigation bar should only update upon load.
    if (Device.isAndroid()) {
      changeAddressBar(nativeEvent);
    }

    icon.current = null;
    if (isHomepage(nativeEvent.url)) {
      injectHomePageScripts();
    }

    // Reset the previous bridges
    backgroundBridges.current.length &&
      backgroundBridges.current.forEach((bridge) => bridge.onDisconnect());
    backgroundBridges.current = [];
    const origin = new URL(nativeEvent.url).origin;
    initializeBackgroundBridge(origin, true);
  };

  /**
   * Enable the header to toggle the url modal and update other header data
   */
  useEffect(() => {
    if (props.activeTab === props.id) {
      props.navigation.setParams({
        showUrlModal: toggleUrlModal,
        url: getMaskedUrl(url.current),
        icon: icon.current,
        error,
      });
    }
    /* we do not want to depend on the entire props object
		- since we are changing it here, this would give us a circular dependency and infinite re renders
		*/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, props.activeTab, props.id, toggleUrlModal]);

  /**
   * Render the progress bar
   */
  const renderProgressBar = () => (
    <View style={styles.progressBarWrapper}>
      <WebviewProgressBar progress={progress} />
    </View>
  );

  /**
   * Handle error, for example, ssl certificate error
   */
  const onError = ({ nativeEvent: errorInfo }) => {
    Logger.log(errorInfo);
    props.navigation.setParams({
      error: true,
    });
    setError(errorInfo);
  };

  /**
   * Track new tab event
   */
  const trackNewTabEvent = () => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_NEW_TAB, {
      option_chosen: 'Browser Options',
      number_of_tabs: undefined,
    });
  };

  /**
   * Track add site to favorites event
   */
  const trackAddToFavoritesEvent = () => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_ADD_FAVORITES, {
      dapp_name: title.current || '',
      dapp_url: url.current || '',
    });
  };

  /**
   * Track share site event
   */
  const trackShareEvent = () => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_SHARE_SITE);
  };

  /**
   * Track change network event
   */
  const trackSwitchNetworkEvent = ({ from }) => {
    AnalyticsV2.trackEvent(
      AnalyticsV2.ANALYTICS_EVENTS.BROWSER_SWITCH_NETWORK,
      {
        from_chain_id: from,
      },
    );
  };

  /**
   * Track reload site event
   */
  const trackReloadEvent = () => {
    AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.BROWSER_RELOAD);
  };

  /**
   * Add bookmark
   */
  const addBookmark = () => {
    toggleOptionsIfNeeded();
    props.navigation.push('AddBookmarkView', {
      screen: 'AddBookmark',
      params: {
        title: title.current || '',
        url: getMaskedUrl(url.current),
        onAddBookmark: async ({ name, url }) => {
          props.addBookmark({ name, url });
          if (Device.isIos()) {
            const item = {
              uniqueIdentifier: url,
              title: name || getMaskedUrl(url),
              contentDescription: `Launch ${name || url} on MetaMask`,
              keywords: [name.split(' '), url, 'dapp'],
              thumbnail: {
                uri:
                  icon.current ||
                  `https://api.faviconkit.com/${getHost(url)}/256`,
              },
            };
            try {
              SearchApi.indexSpotlightItem(item);
            } catch (e) {
              Logger.error(e, 'Error adding to spotlight');
            }
          }
        },
      },
    });
    trackAddToFavoritesEvent();
    Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_ADD_TO_FAVORITE);
  };

  /**
   * Share url
   */
  const share = () => {
    toggleOptionsIfNeeded();
    Share.open({
      url: url.current,
    }).catch((err) => {
      Logger.log('Error while trying to share address', err);
    });
    trackShareEvent();
  };

  /**
   * Open external link
   */
  const openInBrowser = () => {
    toggleOptionsIfNeeded();
    Linking.openURL(url.current).catch((error) =>
      Logger.log(
        `Error while trying to open external link: ${url.current}`,
        error,
      ),
    );
    Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_OPEN_IN_BROWSER);
  };

  /**
   * Handles reload button press
   */
  const onReloadPress = () => {
    toggleOptionsIfNeeded();
    reload();
    trackReloadEvent();
  };

  /**
   * Render non-homepage options menu
   */
  const renderNonHomeOptions = () => {
    if (isHomepage()) return null;

    return (
      <React.Fragment>
        <Button onPress={onReloadPress} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="refresh" size={15} style={styles.optionIcon} />
          </View>
          <Text style={styles.optionText} numberOfLines={2}>
            {strings('browser.reload')}
          </Text>
        </Button>
        {!isBookmark() && (
          <Button onPress={addBookmark} style={styles.option}>
            <View style={styles.optionIconWrapper}>
              <Icon name="star" size={16} style={styles.optionIcon} />
            </View>
            <Text style={styles.optionText} numberOfLines={2}>
              {strings('browser.add_to_favorites')}
            </Text>
          </Button>
        )}
        <Button onPress={share} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="share" size={15} style={styles.optionIcon} />
          </View>
          <Text style={styles.optionText} numberOfLines={2}>
            {strings('browser.share')}
          </Text>
        </Button>
        <Button onPress={openInBrowser} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="expand" size={16} style={styles.optionIcon} />
          </View>
          <Text style={styles.optionText} numberOfLines={2}>
            {strings('browser.open_in_browser')}
          </Text>
        </Button>
      </React.Fragment>
    );
  };

  /**
   * Handle new tab button press
   */
  const onNewTabPress = () => {
    openNewTab();
    trackNewTabEvent();
  };

  /**
   * Handle switch network press
   */
  const switchNetwork = () => {
    const { toggleNetworkModal, network } = props;
    toggleOptionsIfNeeded();
    toggleNetworkModal();
    trackSwitchNetworkEvent({ from: network });
  };

  /**
   * Render options menu
   */
  const renderOptions = () => {
    if (showOptions) {
      return (
        <TouchableWithoutFeedback onPress={toggleOptions}>
          <View style={styles.optionsOverlay}>
            <View
              style={[
                styles.optionsWrapper,
                Device.isAndroid()
                  ? styles.optionsWrapperAndroid
                  : styles.optionsWrapperIos,
              ]}
            >
              <Button onPress={onNewTabPress} style={styles.option}>
                <View style={styles.optionIconWrapper}>
                  <MaterialCommunityIcon
                    name="plus"
                    size={18}
                    style={styles.optionIcon}
                  />
                </View>
                <Text style={styles.optionText} numberOfLines={1}>
                  {strings('browser.new_tab')}
                </Text>
              </Button>
              {renderNonHomeOptions()}
              <Button onPress={switchNetwork} style={styles.option}>
                <View style={styles.optionIconWrapper}>
                  <MaterialCommunityIcon
                    name="earth"
                    size={18}
                    style={styles.optionIcon}
                  />
                </View>
                <Text style={styles.optionText} numberOfLines={2}>
                  {strings('browser.switch_network')}
                </Text>
              </Button>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }
  };

  /**
   * Show the different tabs
   */
  const showTabs = () => {
    dismissTextSelectionIfNeeded();
    props.showTabs();
  };

  /**
   * Render the bottom (navigation/options) bar
   */
  const renderBottomBar = () => (
    <BrowserBottomBar
      canGoBack={backEnabled}
      canGoForward={forwardEnabled}
      goForward={goForward}
      goBack={goBack}
      showTabs={showTabs}
      showUrlModal={toggleUrlModal}
      toggleOptions={toggleOptions}
      goHome={goToHomepage}
    />
  );

  /**
   * Render the onboarding wizard browser step
   */
  const renderOnboardingWizard = () => {
    const { wizardStep } = props;
    if ([6].includes(wizardStep)) {
      if (!wizardScrollAdjusted.current) {
        setTimeout(() => {
          reload();
        }, 1);
        wizardScrollAdjusted.current = true;
      }
      return <OnboardingWizard navigation={props.navigation} />;
    }
    return null;
  };

  /**
   * Return to the MetaMask Dapp Homepage
   */
  const returnHome = () => {
    go(HOMEPAGE_HOST);
  };

  const handleOnFileDownload = useCallback(
    async ({ nativeEvent: { downloadUrl } }) => {
      const downloadResponse = await downloadFile(downloadUrl);
      if (downloadResponse) {
        reload();
      } else {
        Alert.alert(strings('download_files.error'));
        reload();
      }
    },
    [reload],
  );

  /**
   * Main render
   */
  return (
    <ErrorBoundary view="BrowserTab">
      <View
        style={[styles.wrapper, !isTabActive() && styles.hide]}
        {...(Device.isAndroid() ? { collapsable: false } : {})}
      >
        <View style={styles.webview}>
          {!!entryScriptWeb3 && firstUrlLoaded && (
            <WebView
              decelerationRate={'normal'}
              ref={webviewRef}
              renderError={() => (
                <WebviewError error={error} returnHome={returnHome} />
              )}
              source={{ uri: initialUrl }}
              injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
              style={styles.webview}
              onLoadStart={onLoadStart}
              onLoad={onLoad}
              onLoadEnd={onLoadEnd}
              onLoadProgress={onLoadProgress}
              onMessage={onMessage}
              onError={onError}
              onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
              userAgent={USER_AGENT}
              sendCookies
              javascriptEnabled
              allowsInlineMediaPlayback
              useWebkit
              testID={'browser-webview'}
              onFileDownload={handleOnFileDownload}
            />
          )}
        </View>
        {renderProgressBar()}
        {isTabActive() && renderPhishingModal()}
        {isTabActive() && renderOptions()}
        {isTabActive() && renderBottomBar()}
        {isTabActive() && renderOnboardingWizard()}
      </View>
    </ErrorBoundary>
  );
};

BrowserTab.propTypes = {
  /**
   * The ID of the current tab
   */
  id: PropTypes.number,
  /**
   * The ID of the active tab
   */
  activeTab: PropTypes.number,
  /**
   * InitialUrl
   */
  initialUrl: PropTypes.string,
  /**
   * Called to approve account access for a given hostname
   */
  approveHost: PropTypes.func,
  /**
   * Map of hostnames with approved account access
   */
  approvedHosts: PropTypes.object,
  /**
   * Protocol string to append to URLs that have none
   */
  defaultProtocol: PropTypes.string,
  /**
   * A string that of the chosen ipfs gateway
   */
  ipfsGateway: PropTypes.string,
  /**
   * Object containing the information for the current transaction
   */
  transaction: PropTypes.object,
  /**
   * react-navigation object used to switch between screens
   */
  navigation: PropTypes.object,
  /**
   * A string representing the network id
   */
  network: PropTypes.string,
  /**
   * Indicates whether privacy mode is enabled
   */
  privacyMode: PropTypes.bool,
  /**
   * A string that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * whitelisted url to bypass the phishing detection
   */
  whitelist: PropTypes.array,
  /**
   * Url coming from an external source
   * For ex. deeplinks
   */
  url: PropTypes.string,
  /**
   * Function to toggle the network switcher modal
   */
  toggleNetworkModal: PropTypes.func,
  /**
   * Function to open a new tab
   */
  newTab: PropTypes.func,
  /**
   * Function to store bookmarks
   */
  addBookmark: PropTypes.func,
  /**
   * Array of bookmarks
   */
  bookmarks: PropTypes.array,
  /**
   * String representing the current search engine
   */
  searchEngine: PropTypes.string,
  /**
   * Function to store the a page in the browser history
   */
  addToBrowserHistory: PropTypes.func,
  /**
   * Function to store the a website in the browser whitelist
   */
  addToWhitelist: PropTypes.func,
  /**
   * Function to update the tab information
   */
  updateTabInfo: PropTypes.func,
  /**
   * Function to update the tab information
   */
  showTabs: PropTypes.func,
  /**
   * Action to set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
  /**
   * Current onboarding wizard step
   */
  wizardStep: PropTypes.number,
  /**
   * the current version of the app
   */
  app_version: PropTypes.string,
};

BrowserTab.defaultProps = {
  defaultProtocol: 'https://',
};

const mapStateToProps = (state) => ({
  approvedHosts: state.privacy.approvedHosts,
  bookmarks: state.bookmarks,
  ipfsGateway: state.engine.backgroundState.PreferencesController.ipfsGateway,
  network: state.engine.backgroundState.NetworkController.network,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress?.toLowerCase(),
  privacyMode: state.privacy.privacyMode,
  searchEngine: state.settings.searchEngine,
  whitelist: state.browser.whitelist,
  activeTab: state.browser.activeTab,
  wizardStep: state.wizard.step,
});

const mapDispatchToProps = (dispatch) => ({
  approveHost: (hostname) => dispatch(approveHost(hostname)),
  addBookmark: (bookmark) => dispatch(addBookmark(bookmark)),
  addToBrowserHistory: ({ url, name }) => dispatch(addToHistory({ url, name })),
  addToWhitelist: (url) => dispatch(addToWhitelist(url)),
  toggleNetworkModal: () => dispatch(toggleNetworkModal()),
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withNavigation(BrowserTab));
