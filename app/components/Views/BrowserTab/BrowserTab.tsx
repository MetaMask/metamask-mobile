import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { View, Alert, BackHandler, ImageSourcePropType, KeyboardAvoidingView, Platform } from 'react-native';
import { isEqual } from 'lodash';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import { connect, useSelector } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge/BackgroundBridge';
import Engine from '../../../core/Engine';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import Logger from '../../../util/Logger';
import {
  processUrlForBrowser,
  prefixUrlWithProtocol,
  isTLD,
  protocolAllowList,
  trustedProtocolToDeeplink,
  getAlertMessage,
  allowLinkOpen,
  getUrlObj,
} from '../../../util/browser';
import {
  SPA_urlChangeListener,
  JS_DESELECT_TEXT,
} from '../../../util/browserScripts';
import resolveEnsToIpfsContentId from '../../../lib/ens-ipfs/resolver';
import { strings } from '../../../../locales/i18n';
import URLParse from 'url-parse';
import WebviewErrorComponent from '../../UI/WebviewError';
import { addToHistory, addToWhitelist } from '../../../actions/browser';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../core/Analytics';
import OnboardingWizard from '../../UI/OnboardingWizard';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import ErrorBoundary from '../ErrorBoundary';
import { getRpcMethodMiddleware } from '../../../core/RPCMethods/RPCMethodMiddleware';
import downloadFile from '../../../util/browser/downloadFile';
import { MAX_MESSAGE_LENGTH } from '../../../constants/dapp';
import sanitizeUrlInput from '../../../util/url/sanitizeUrlInput';
import { getPermittedAccountsByHostname } from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';
import {
  selectIpfsGateway,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import useFavicon from '../../hooks/useFavicon/useFavicon';
import {
  HOMEPAGE_HOST,
  IPFS_GATEWAY_DISABLED_ERROR,
  OLD_HOMEPAGE_URL_HOST,
  NOTIFICATION_NAMES,
  MM_MIXPANEL_TOKEN,
} from './constants';
import { regex } from '../../../../app/util/regex';
import { selectChainId } from '../../../selectors/networkController';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { trackDappViewedEvent } from '../../../util/metrics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { selectPermissionControllerState } from '../../../selectors/snaps/permissionController';
import { isTest } from '../../../util/test/utils.js';
import { EXTERNAL_LINK_TYPE } from '../../../constants/browser';
import { PermissionKeys } from '../../../core/Permissions/specifications';
import { CaveatTypes } from '../../../core/Permissions/constants';
import { AccountPermissionsScreens } from '../AccountPermissions/AccountPermissions.types';
import { isMultichainVersion1Enabled } from '../../../util/networks';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './styles';
import { type RootState } from '../../../reducers';
import { type Dispatch } from 'redux';
import {
  type SessionENSNames,
  type BrowserTabProps,
  type IpfsContentResult,
  WebViewNavigationEventName,
} from './types';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  WebViewNavigationEvent,
  WebViewErrorEvent,
  WebViewError,
  WebViewProgressEvent,
  WebViewNavigation,
} from '@metamask/react-native-webview/lib/WebViewTypes';
import PhishingModal from './components/PhishingModal';
import BrowserUrlBar, {
  ConnectionType,
  BrowserUrlBarRef,
} from '../../UI/BrowserUrlBar';
import { getMaskedUrl, isENSUrl } from './utils';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import Options from './components/Options';
import IpfsBanner from './components/IpfsBanner';
import UrlAutocomplete, { UrlAutocompleteRef } from '../../UI/UrlAutocomplete';
import { selectSearchEngine } from '../../../reducers/browser/selectors';

/**
 * Tab component for the in-app browser
 */
export const BrowserTab: React.FC<BrowserTabProps> = ({
  id: tabId,
  isIpfsGatewayEnabled,
  addToWhitelist: triggerAddToWhitelist,
  showTabs,
  linkType,
  isInTabsView,
  wizardStep,
  updateTabInfo,
  addToBrowserHistory,
  bookmarks,
  initialUrl,
  ipfsGateway,
  newTab,
  homePageUrl,
  activeChainId,
}) => {
  // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { styles } = useStyles(styleSheet, {});
  const [backEnabled, setBackEnabled] = useState(false);
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [allowedInitialUrl, setAllowedInitialUrl] = useState('');
  const [firstUrlLoaded, setFirstUrlLoaded] = useState(false);
  const [error, setError] = useState<boolean | WebViewError>(false);
  const [showOptions, setShowOptions] = useState(false);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState<string>();
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState<string>();
  const [ipfsBannerVisible, setIpfsBannerVisible] = useState(false);
  const [isResolvedIpfsUrl, setIsResolvedIpfsUrl] = useState(false);
  const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);
  const [connectionType, setConnectionType] = useState(ConnectionType.UNKNOWN);
  const webviewRef = useRef<WebView>(null);
  const blockListType = useRef<string>(''); // TODO: Consider improving this type
  const webStates = useRef<
    Record<string, { requested: boolean; started: boolean; ended: boolean }>
  >({});
  // Track if webview is loaded for the first time
  const isWebViewReadyToLoad = useRef(false);
  const urlBarRef = useRef<BrowserUrlBarRef>(null);
  const autocompleteRef = useRef<UrlAutocompleteRef>(null);
  const onSubmitEditingRef = useRef<(text: string) => Promise<void>>(
    async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
    },
  );
  //const [resolvedUrl, setResolvedUrl] = useState('');
  const resolvedUrlRef = useRef('');
  const submittedUrlRef = useRef('');
  const titleRef = useRef<string>('');
  const iconRef = useRef<ImageSourcePropType | undefined>();
  const sessionENSNamesRef = useRef<SessionENSNames>({});
  const ensIgnoreListRef = useRef<string[]>([]);
  const backgroundBridgeRef = useRef<{
    url: string;
    hostname: string;
    sendNotification: (payload: unknown) => void;
    onDisconnect: () => void;
    onMessage: (message: Record<string, unknown>) => void;
  }>();
  const fromHomepage = useRef(false);
  const wizardScrollAdjustedRef = useRef(false);
  const searchEngine = useSelector(selectSearchEngine);
  const permittedAccountsList = useSelector((state: RootState) => {
    const permissionsControllerState = selectPermissionControllerState(state);
    const hostname = new URLParse(resolvedUrlRef.current).hostname;
    const permittedAcc = getPermittedAccountsByHostname(
      permissionsControllerState,
      hostname,
    );
    return permittedAcc;
  }, isEqual);

  const favicon = useFavicon(resolvedUrlRef.current);
  const { trackEvent, isEnabled, getMetaMetricsId, createEventBuilder } =
    useMetrics();
  /**
   * Is the current tab the active tab
   */
  const isTabActive = useSelector(
    (state: RootState) => state.browser.activeTab === tabId,
  );

  /**
   * whitelisted url to bypass the phishing detection
   */
  const whitelist = useSelector((state: RootState) => state.browser.whitelist);

  const isFocused = useIsFocused();

  /**
   * Checks if a given url or the current url is the homepage
   */
  const isHomepage = useCallback((checkUrl = null) => {
    const currentPage = checkUrl || resolvedUrlRef.current;
    const prefixedUrl = prefixUrlWithProtocol(currentPage);
    const { host: currentHost } = getUrlObj(prefixedUrl);
    return (
      currentHost === HOMEPAGE_HOST || currentHost === OLD_HOMEPAGE_URL_HOST
    );
  }, []);

  const notifyAllConnections = useCallback((payload) => {
    backgroundBridgeRef.current?.sendNotification(payload);
  }, []);

  /**
   * Dismiss the text selection on the current website
   */
  const dismissTextSelectionIfNeeded = useCallback(() => {
    if (isTabActive && Device.isAndroid()) {
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

    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_BROWSER_OPTIONS).build(),
    );
  }, [
    dismissTextSelectionIfNeeded,
    showOptions,
    trackEvent,
    createEventBuilder,
  ]);

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
    if (!current) {
      Logger.log('WebviewRef current is not defined!');
    }
    // Reset error state
    setError(false);
    current?.goBack?.();
  }, [backEnabled, toggleOptionsIfNeeded]);

  /**
   * Go forward to the next website in history
   */
  const goForward = async () => {
    if (!forwardEnabled) return;

    toggleOptionsIfNeeded();
    const { current } = webviewRef;
    current?.goForward?.();
  };

  /**
   * Check if an origin is allowed
   */
  const isAllowedOrigin = useCallback(
    (urlOrigin: string) => {
      const { PhishingController } = Engine.context;

      // Update phishing configuration if it is out-of-date
      // This is async but we are not `await`-ing it here intentionally, so that we don't slow
      // down network requests. The configuration is updated for the next request.
      PhishingController.maybeUpdateState();

      const phishingControllerTestResult = PhishingController.test(urlOrigin);

      // Only assign the if the hostname is on the block list
      if (
        phishingControllerTestResult.result &&
        phishingControllerTestResult.name
      )
        blockListType.current = phishingControllerTestResult.name;

      return (
        whitelist?.includes(urlOrigin) || !phishingControllerTestResult.result
      );
    },
    [whitelist],
  );

  /**
   * Show a phishing modal when a url is not allowed
   */
  const handleNotAllowedUrl = useCallback((urlOrigin: string) => {
    setBlockedUrl(urlOrigin);
    setTimeout(() => setShowPhishingModal(true), 1000);
  }, []);

  /**
   * Get IPFS info from a ens url
   * TODO: Consider improving this function and it's types
   */
  const handleIpfsContent = useCallback(
    async (
      fullUrl,
      { hostname, pathname, query },
    ): Promise<IpfsContentResult | undefined | null> => {
      const { provider } =
        Engine.context.NetworkController.getProviderAndBlockTracker();
      let gatewayUrl;
      try {
        const { type, hash } = await resolveEnsToIpfsContentId({
          provider,
          name: hostname,
          chainId: activeChainId,
        });
        if (type === 'ipfs-ns') {
          gatewayUrl = `${ipfsGateway}${hash}${pathname || '/'}${query || ''}`;
          const response = await fetch(gatewayUrl);
          const statusCode = response.status;
          if (statusCode >= 400) {
            Logger.log('Status code ', statusCode, gatewayUrl);
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
      } catch (err: unknown) {
        const handleIpfsContentError = err as Error;
        //if it's not a ENS but a TLD (Top Level Domain)
        if (isTLD(hostname, handleIpfsContentError)) {
          ensIgnoreListRef.current.push(hostname);
          return { url: fullUrl, reload: true };
        }
        if (
          handleIpfsContentError?.message?.startsWith(
            'EnsIpfsResolver - no known ens-ipfs registry for chainId',
          )
        ) {
          trackErrorAsAnalytics(
            'Browser: Failed to resolve ENS name for chainId',
            handleIpfsContentError?.message,
          );
        } else {
          Logger.error(handleIpfsContentError, 'Failed to resolve ENS name');
        }

        if (
          handleIpfsContentError?.message?.startsWith(
            IPFS_GATEWAY_DISABLED_ERROR,
          )
        ) {
          setIpfsBannerVisible(true);
          goBack();
          throw new Error(handleIpfsContentError?.message);
        } else {
          Alert.alert(
            strings('browser.failed_to_resolve_ens_name'),
            handleIpfsContentError.message,
          );
        }
        goBack();
      }
    },
    [goBack, ipfsGateway, setIpfsBannerVisible, activeChainId],
  );

  const triggerDappViewedEvent = useCallback((urlToTrigger: string) => {
    const permissionsControllerState =
      Engine.context.PermissionController.state;
    const hostname = new URLParse(urlToTrigger).hostname;
    const connectedAccounts = getPermittedAccountsByHostname(
      permissionsControllerState,
      hostname,
    );

    // Check if there are any connected accounts
    if (!connectedAccounts.length) {
      return;
    }

    // Track dapp viewed event
    trackDappViewedEvent({
      hostname,
      numberOfConnectedAccounts: connectedAccounts.length,
    });
  }, []);

  /**
   * Open a new tab
   */
  const openNewTab = useCallback(
    (newTabUrl?: string) => {
      toggleOptionsIfNeeded();
      dismissTextSelectionIfNeeded();
      newTab(newTabUrl);
    },
    [dismissTextSelectionIfNeeded, newTab, toggleOptionsIfNeeded],
  );

  /**
   * Handle when the drawer (app menu) is opened
   */
  const drawerOpenHandler = useCallback(() => {
    dismissTextSelectionIfNeeded();
  }, [dismissTextSelectionIfNeeded]);

  const handleFirstUrl = useCallback(async () => {
    setIsResolvedIpfsUrl(false);
    const prefixedUrl = prefixUrlWithProtocol(initialUrl);
    const { origin: urlOrigin } = new URLParse(prefixedUrl);

    if (isAllowedOrigin(urlOrigin)) {
      setAllowedInitialUrl(prefixedUrl);
      setFirstUrlLoaded(true);
      setProgress(0);
      return;
    }

    handleNotAllowedUrl(prefixedUrl);
    return;
  }, [initialUrl, handleNotAllowedUrl, isAllowedOrigin]);

  /**
   * Set initial url, dapp scripts and engine. Similar to componentDidMount
   */
  useEffect(() => {
    if (!isTabActive || isWebViewReadyToLoad.current) return;

    isWebViewReadyToLoad.current = true;

    const getEntryScriptWeb3 = async () => {
      const entryScriptWeb3Fetched = await EntryScriptWeb3.get();
      setEntryScriptWeb3(entryScriptWeb3Fetched + SPA_urlChangeListener);
    };

    getEntryScriptWeb3();
    handleFirstUrl();
  }, [isTabActive, handleFirstUrl]);

  // Cleanup bridges when tab is closed
  useEffect(
    () => () => {
      backgroundBridgeRef.current?.onDisconnect();
    },
    [],
  );

  useEffect(() => {
    if (Device.isAndroid()) {
      DrawerStatusTracker.hub.on('drawer::open', drawerOpenHandler);
    }

    return function cleanup() {
      if (Device.isAndroid()) {
        DrawerStatusTracker?.hub?.removeListener(
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
      if (!isTabActive) return false;
      goBack();
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);

    // Handle hardwareBackPress event only for browser, not components rendered on top
    navigation.addListener('focus', () => {
      BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);
    });
    navigation.addListener('blur', () => {
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
  }, [goBack, isTabActive, navigation]);

  /**
   * Inject home page scripts to get the favourites and set analytics key
   */
  const injectHomePageScripts = useCallback(
    async (injectedBookmarks?: string[]) => {
      const { current } = webviewRef;
      const analyticsEnabled = isEnabled();
      const disctinctId = await getMetaMetricsId();
      const homepageScripts = `
              window.__mmFavorites = ${JSON.stringify(
                injectedBookmarks || bookmarks,
              )};
              window.__mmSearchEngine = "${searchEngine}";
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

      current?.injectJavaScript(homepageScripts);
    },
    [isEnabled, getMetaMetricsId, bookmarks, searchEngine],
  );

  /**
   * Handles error for example, ssl certificate error or cannot open page
   */
  const handleError = useCallback(
    (webViewError: WebViewError) => {
      resolvedUrlRef.current = submittedUrlRef.current;
      titleRef.current = `Can't Open Page`;
      iconRef.current = undefined;
      setConnectionType(ConnectionType.UNKNOWN);
      setBackEnabled(true);
      setForwardEnabled(false);
      // Show error and reset progress bar
      setError(webViewError);
      setProgress(0);

      // Prevent url from being set when the url bar is focused
      !isUrlBarFocused &&
        urlBarRef.current?.setNativeProps({ text: submittedUrlRef.current });

      isTabActive &&
        navigation.setParams({
          url: getMaskedUrl(
            submittedUrlRef.current,
            sessionENSNamesRef.current,
          ),
        });

      // Used to render tab title in tab selection
      updateTabInfo(`Can't Open Page`, tabId);
      Logger.log(webViewError);
    },
    [
      setConnectionType,
      setBackEnabled,
      setForwardEnabled,
      setError,
      setProgress,
      isUrlBarFocused,
      isTabActive,
      tabId,
      updateTabInfo,
      navigation,
    ],
  );

  const checkTabPermissions = useCallback(() => {
    if (
      !(
        isMultichainVersion1Enabled &&
        isFocused &&
        !isInTabsView &&
        isTabActive
      )
    ) {
      return;
    }
    if (!resolvedUrlRef.current) return;
    const hostname = new URLParse(resolvedUrlRef.current).hostname;
    const permissionsControllerState =
      Engine.context.PermissionController.state;
    const permittedAccounts = getPermittedAccountsByHostname(
      permissionsControllerState,
      hostname,
    );

    const isConnected = permittedAccounts.length > 0;

    if (isConnected) {
      let permittedChains = [];
      try {
        const caveat = Engine.context.PermissionController.getCaveat(
          hostname,
          PermissionKeys.permittedChains,
          CaveatTypes.restrictNetworkSwitching,
        );
        permittedChains = Array.isArray(caveat?.value) ? caveat.value : [];

        const currentChainId = activeChainId;
        const isCurrentChainIdAlreadyPermitted =
          permittedChains.includes(currentChainId);

        if (!isCurrentChainIdAlreadyPermitted) {
          navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
            screen: Routes.SHEET.ACCOUNT_PERMISSIONS,
            params: {
              isNonDappNetworkSwitch: true,
              hostInfo: {
                metadata: {
                  origin: hostname,
                },
              },
              isRenderedAsBottomSheet: true,
              initialScreen: AccountPermissionsScreens.Connected,
            },
          });
        }
      } catch (e) {
        const checkTabPermissionsError = e as Error;
        Logger.error(checkTabPermissionsError, 'Error in checkTabPermissions');
      }
    }
  }, [activeChainId, navigation, isFocused, isInTabsView, isTabActive]);

  /**
   * Handles state changes for when the url changes
   */
  const handleSuccessfulPageResolution = useCallback(
    async (siteInfo: {
      url: string;
      title: string;
      icon: ImageSourcePropType;
      canGoBack: boolean;
      canGoForward: boolean;
    }) => {
      resolvedUrlRef.current = siteInfo.url;
      titleRef.current = siteInfo.title;
      if (siteInfo.icon) iconRef.current = siteInfo.icon;

      const hostName = new URLParse(siteInfo.url).hostname;
      // Prevent url from being set when the url bar is focused
      !isUrlBarFocused && urlBarRef.current?.setNativeProps({ text: hostName });

      const contentProtocol = getURLProtocol(siteInfo.url);
      if (contentProtocol === PROTOCOLS.HTTPS) {
        setConnectionType(ConnectionType.SECURE);
      } else if (contentProtocol === PROTOCOLS.HTTP) {
        setConnectionType(ConnectionType.UNSECURE);
      }
      setBackEnabled(siteInfo.canGoBack);
      setForwardEnabled(siteInfo.canGoForward);

      isTabActive &&
        navigation.setParams({
          url: getMaskedUrl(siteInfo.url, sessionENSNamesRef.current),
        });

      updateTabInfo(
        getMaskedUrl(siteInfo.url, sessionENSNamesRef.current),
        tabId,
      );

      addToBrowserHistory({
        name: siteInfo.title,
        url: getMaskedUrl(siteInfo.url, sessionENSNamesRef.current),
      });

      checkTabPermissions();
    },
    [
      isUrlBarFocused,
      setConnectionType,
      isTabActive,
      tabId,
      updateTabInfo,
      addToBrowserHistory,
      navigation,
      checkTabPermissions,
    ],
  );

  /**
   * Function that allows custom handling of any web view requests.
   * Return `true` to continue loading the request and `false` to stop loading.
   */
  const onShouldStartLoadWithRequest = ({
    url: urlToLoad,
  }: {
    url: string;
  }) => {
    const { origin: urlOrigin } = new URLParse(urlToLoad);

    webStates.current[urlToLoad] = {
      ...webStates.current[urlToLoad],
      requested: true,
    };

    // Cancel loading the page if we detect its a phishing page
    if (!isAllowedOrigin(urlOrigin)) {
      handleNotAllowedUrl(urlOrigin);
      return false;
    }

    if (!isIpfsGatewayEnabled && isResolvedIpfsUrl) {
      setIpfsBannerVisible(true);
      return false;
    }

    // Continue request loading it the protocol is whitelisted
    const { protocol } = new URLParse(urlToLoad);
    if (protocolAllowList.includes(protocol)) return true;
    Logger.log(`Protocol not allowed ${protocol}`);

    // If it is a trusted deeplink protocol, do not show the
    // warning alert. Allow the OS to deeplink the URL
    // and stop the webview from loading it.
    if (trustedProtocolToDeeplink.includes(protocol)) {
      allowLinkOpen(urlToLoad);
      return false;
    }

    // TODO: add logging for untrusted protocol being used
    // Sentry
    const alertMsg = getAlertMessage(protocol, strings);

    // Pop up an alert dialog box to prompt the user for permission
    // to execute the request
    Alert.alert(strings('onboarding.warning_title'), alertMsg, [
      {
        text: strings('browser.protocol_alert_options.ignore'),
        onPress: () => null,
        style: 'cancel',
      },
      {
        text: strings('browser.protocol_alert_options.allow'),
        onPress: () => allowLinkOpen(urlToLoad),
        style: 'default',
      },
    ]);

    return false;
  };

  /**
   * Sets loading bar progress
   */
  const onLoadProgress = useCallback(
    ({
      nativeEvent: { progress: onLoadProgressProgress },
    }: WebViewProgressEvent) => {
      setProgress(onLoadProgressProgress);
    },
    [setProgress],
  );

  /**
   * When website finished loading
   */
  const onLoadEnd = useCallback(
    ({
      event: { nativeEvent },
      forceResolve,
    }: {
      event: WebViewNavigationEvent | WebViewErrorEvent;
      forceResolve?: boolean;
    }) => {
      if ('code' in nativeEvent) {
        // Handle error - code is a property of WebViewErrorEvent
        return handleError(nativeEvent);
      }

      // Handle navigation event
      const { url, title, canGoBack, canGoForward } = nativeEvent;
      // Do not update URL unless website has successfully completed loading.
      webStates.current[url] = { ...webStates.current[url], ended: true };
      const { started, ended } = webStates.current[url];
      const incomingOrigin = new URLParse(url).origin;
      const activeOrigin = new URLParse(resolvedUrlRef.current).origin;
      if (
        forceResolve ||
        (started && ended) ||
        incomingOrigin === activeOrigin
      ) {
        delete webStates.current[url];
        // Update navigation bar address with title of loaded url.
        handleSuccessfulPageResolution({
          title,
          url,
          icon: favicon,
          canGoBack,
          canGoForward,
        });
      }
    },
    [handleError, handleSuccessfulPageResolution, favicon],
  );

  /**
   * Handle message from website
   */
  const onMessage = ({ nativeEvent }: WebViewMessageEvent) => {
    const data = nativeEvent.data;
    try {
      if (data.length > MAX_MESSAGE_LENGTH) {
        console.warn(
          `message exceeded size limit and will be dropped: ${data.slice(
            0,
            1000,
          )}...`,
        );
        return;
      }
      const dataParsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!dataParsed || (!dataParsed.type && !dataParsed.name)) {
        return;
      }
      if (dataParsed.name) {
        backgroundBridgeRef.current?.onMessage(dataParsed);
        return;
      }
    } catch (e: unknown) {
      const onMessageError = e as Error;
      Logger.error(
        onMessageError,
        `Browser::onMessage on ${resolvedUrlRef.current}`,
      );
    }
  };

  const toggleUrlModal = useCallback(() => {
    urlBarRef.current?.focus();
  }, []);

  const initializeBackgroundBridge = useCallback(
    (urlBridge: string, isMainFrame: boolean) => {
      // First disconnect and reset bridge
      backgroundBridgeRef.current?.onDisconnect();
      backgroundBridgeRef.current = undefined;

      //@ts-expect-error - We should type bacgkround bridge js file
      const newBridge = new BackgroundBridge({
        webview: webviewRef,
        url: urlBridge,
        getRpcMethodMiddleware: ({
          hostname,
          getProviderState,
        }: {
          hostname: string;
          getProviderState: () => void;
        }) =>
          getRpcMethodMiddleware({
            hostname,
            getProviderState,
            navigation,
            // Website info
            url: resolvedUrlRef,
            title: titleRef,
            icon: iconRef,
            // Bookmarks
            isHomepage,
            // Show autocomplete
            fromHomepage,
            toggleUrlModal,
            // Wizard
            wizardScrollAdjusted: wizardScrollAdjustedRef,
            tabId,
            injectHomePageScripts,
            // TODO: This properties were missing, and were not optional
            isWalletConnect: false,
            isMMSDK: false,
            analytics: {},
          }),
        isMainFrame,
      });
      backgroundBridgeRef.current = newBridge;
    },
    [navigation, isHomepage, toggleUrlModal, tabId, injectHomePageScripts],
  );

  const sendActiveAccount = useCallback(async () => {
    notifyAllConnections({
      method: NOTIFICATION_NAMES.accountsChanged,
      params: permittedAccountsList,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyAllConnections, permittedAccountsList]);

  /**
   * Website started to load
   */
  const onLoadStart = useCallback(
    async ({ nativeEvent }: WebViewNavigationEvent) => {
      // Use URL to produce real url. This should be the actual website that the user is viewing.
      const { origin: urlOrigin } = new URLParse(nativeEvent.url);

      webStates.current[nativeEvent.url] = {
        ...webStates.current[nativeEvent.url],
        started: true,
      };

      // Cancel loading the page if we detect its a phishing page
      if (!isAllowedOrigin(urlOrigin)) {
        handleNotAllowedUrl(urlOrigin); // should this be activeUrl.current instead of url?
        return false;
      }

      sendActiveAccount();

      iconRef.current = undefined;
      if (isHomepage(nativeEvent.url)) {
        injectHomePageScripts();
      }

      initializeBackgroundBridge(urlOrigin, true);
    },
    [
      isAllowedOrigin,
      handleNotAllowedUrl,
      sendActiveAccount,
      isHomepage,
      injectHomePageScripts,
      initializeBackgroundBridge,
    ],
  );

  /**
   * Check whenever permissions change / account changes for Dapp
   */
  useEffect(() => {
    sendActiveAccount();
  }, [sendActiveAccount, permittedAccountsList]);

  /**
   * Check when the ipfs gateway is enabled to hide the banner
   */
  useEffect(() => {
    if (isIpfsGatewayEnabled) {
      setIpfsBannerVisible(false);
    }
  }, [isIpfsGatewayEnabled]);

  /**
   * Render the progress bar
   */
  const renderProgressBar = () => (
    <View style={styles.progressBarWrapper}>
      <WebviewProgressBar progress={progress} />
    </View>
  );

  /**
   * Track new tab event
   */
  const trackNewTabEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_NEW_TAB)
        .addProperties({
          option_chosen: 'Browser Options',
          number_of_tabs: undefined,
        })
        .build(),
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
   * Show the different tabs
   */
  const triggerShowTabs = () => {
    dismissTextSelectionIfNeeded();
    showTabs();
  };

  const isExternalLink = useMemo(
    () => linkType === EXTERNAL_LINK_TYPE,
    [linkType],
  );

  useEffect(() => {
    checkTabPermissions();
  }, [checkTabPermissions, isFocused, isInTabsView, isTabActive]);

  const handleEnsUrl = useCallback(
    async (ens: string) => {
      try {
        webviewRef.current?.stopLoading();

        const { hostname, query, pathname } = new URLParse(ens);
        const ipfsContent = await handleIpfsContent(ens, {
          hostname,
          query,
          pathname,
        });
        if (!ipfsContent?.url) return null;
        const { url: ipfsUrl, reload } = ipfsContent;
        // Reload with IPFS url
        if (reload) return onSubmitEditingRef.current?.(ipfsUrl);
        if (!ipfsContent.hash || !ipfsContent.type) {
          Logger.error(
            new Error('IPFS content is missing hash or type'),
            'Error in handleEnsUrl',
          );
          return null;
        }
        const { type, hash } = ipfsContent;
        sessionENSNamesRef.current[ipfsUrl] = { hostname, hash, type };
        setIsResolvedIpfsUrl(true);
        return ipfsUrl;
      } catch (_) {
        return null;
      }
    },
    [handleIpfsContent, setIsResolvedIpfsUrl],
  );

  const onSubmitEditing = useCallback(
    async (text: string) => {
      if (!text) return;
      setConnectionType(ConnectionType.UNKNOWN);
      urlBarRef.current?.setNativeProps({ text });
      submittedUrlRef.current = text;
      webviewRef.current?.stopLoading();
      // Format url for browser to be navigatable by webview
      const processedUrl = processUrlForBrowser(text, searchEngine);
      if (isENSUrl(processedUrl, ensIgnoreListRef.current)) {
        const handledEnsUrl = await handleEnsUrl(
          processedUrl.replace(regex.urlHttpToHttps, 'https://'),
        );
        if (!handledEnsUrl) {
          Logger.error(
            new Error('Failed to handle ENS url'),
            'Error in onSubmitEditing',
          );
          return;
        }
        return onSubmitEditingRef.current(handledEnsUrl);
      }
      // Directly update url in webview
      webviewRef.current?.injectJavaScript(`
      window.location.href = '${sanitizeUrlInput(processedUrl)}';
      true;  // Required for iOS
    `);
    },
    [searchEngine, handleEnsUrl, setConnectionType],
  );

  // Assign the memoized function to the ref. This is needed since onSubmitEditing is a useCallback and is accessed recursively
  useEffect(() => {
    onSubmitEditingRef.current = onSubmitEditing;
  }, [onSubmitEditing]);

  /**
   * Go to home page, reload if already on homepage
   */
  const goToHomepage = useCallback(async () => {
    onSubmitEditing(homePageUrl);
    toggleOptionsIfNeeded();
    triggerDappViewedEvent(resolvedUrlRef.current);
    trackEvent(createEventBuilder(MetaMetricsEvents.DAPP_HOME).build());
  }, [
    toggleOptionsIfNeeded,
    triggerDappViewedEvent,
    trackEvent,
    createEventBuilder,
    onSubmitEditing,
    homePageUrl,
  ]);

  /**
   * Reload current page
   */
  const reload = useCallback(() => {
    onSubmitEditing(resolvedUrlRef.current);
    triggerDappViewedEvent(resolvedUrlRef.current);
  }, [onSubmitEditing, triggerDappViewedEvent]);

  /**
   * Render the onboarding wizard browser step
   */
  const renderOnboardingWizard = () => {
    if ([7].includes(wizardStep)) {
      if (!wizardScrollAdjustedRef.current) {
        setTimeout(() => {
          reload();
        }, 1);
        wizardScrollAdjustedRef.current = true;
      }
      return <OnboardingWizard navigation={navigation} />;
    }
    return null;
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
   * Return to the MetaMask Dapp Homepage
   */
  const returnHome = () => {
    onSubmitEditing(HOMEPAGE_HOST);
  };

  /**
   * Render the bottom (navigation/options) bar
   */
  const renderBottomBar = () =>
    isTabActive && !isUrlBarFocused ? (
      <BrowserBottomBar
        canGoBack={backEnabled}
        canGoForward={forwardEnabled}
        goForward={goForward}
        goBack={goBack}
        showTabs={triggerShowTabs}
        showUrlModal={toggleUrlModal}
        toggleOptions={toggleOptions}
        goHome={goToHomepage}
      />
    ) : null;

  /**
   * Handle autocomplete selection
   */
  const onSelect = (url: string) => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.hide();
    onSubmitEditing(url);
  };

  /**
   * Handle autocomplete dismissal
   */
  const onDismissAutocomplete = () => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.hide();
    const hostName =
      new URLParse(resolvedUrlRef.current).hostname || resolvedUrlRef.current;
    urlBarRef.current?.setNativeProps({ text: hostName });
  };

  /**
   * Hide the autocomplete results
   */
  const hideAutocomplete = () => autocompleteRef.current?.hide();

  const onCancelUrlBar = () => {
    hideAutocomplete();
    // Reset the url bar to the current url
    const hostName =
      new URLParse(resolvedUrlRef.current).hostname || resolvedUrlRef.current;
    urlBarRef.current?.setNativeProps({ text: hostName });
  };

  const onFocusUrlBar = () => {
    // Show the autocomplete results
    autocompleteRef.current?.show();
    urlBarRef.current?.setNativeProps({ text: resolvedUrlRef.current });
  };

  const onChangeUrlBar = (text: string) =>
    // Search the autocomplete results
    autocompleteRef.current?.search(text);

  const handleWebviewNavigationChange = useCallback(
    (eventName: WebViewNavigationEventName) =>
      (
        syntheticEvent:
          | WebViewNavigationEvent
          | WebViewProgressEvent
          | WebViewErrorEvent,
      ) => {
        const { OnLoadEnd, OnLoadProgress, OnLoadStart } =
          WebViewNavigationEventName;

        const mappingEventNameString = () => {
          switch (eventName) {
            case OnLoadProgress:
              return 'onLoadProgress';
            case OnLoadEnd:
              return 'onLoadEnd';
            case OnLoadStart:
              return 'onLoadStart';
            default:
              return 'Invalid navigation name';
          }
        };

        Logger.log(
          `WEBVIEW NAVIGATING: ${mappingEventNameString()} \n Values: ${JSON.stringify(
            syntheticEvent.nativeEvent,
          )}`,
        );

        switch (eventName) {
          case OnLoadProgress:
            return onLoadProgress(syntheticEvent as WebViewProgressEvent);
          case OnLoadEnd:
            return onLoadEnd({
              event: syntheticEvent as
                | WebViewNavigationEvent
                | WebViewErrorEvent,
            });
          case OnLoadStart:
            return onLoadStart(syntheticEvent as WebViewNavigationEvent);
          default:
            return;
        }
      },
    [onLoadProgress, onLoadEnd, onLoadStart],
  );

  const { OnLoadEnd, OnLoadProgress, OnLoadStart } = WebViewNavigationEventName;

  const handleOnNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      const {
        title: titleFromNativeEvent,
        canGoForward,
        canGoBack,
        navigationType,
        url,
      } = event;
      Logger.log(
        `WEBVIEW NAVIGATING: OnNavigationStateChange \n Values: ${JSON.stringify(
          event,
        )}`,
      );
      // Handles force resolves url when going back since the behavior slightly differs that results in onLoadEnd not being called
      if (navigationType === 'backforward') {
        const payload = {
          nativeEvent: {
            url,
            title: titleFromNativeEvent,
            canGoBack,
            canGoForward,
          },
        };
        onLoadEnd({
          event: payload as WebViewNavigationEvent | WebViewErrorEvent,
          forceResolve: true,
        });
      }
    },
    [onLoadEnd],
  );

  // Don't render webview unless ready to load. This should save on performance for initial app start.
  if (!isWebViewReadyToLoad.current) return null;

  /**
   * Main render
   */
  return (
    <ErrorBoundary navigation={navigation} view="BrowserTab">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.wrapper, !isTabActive && styles.hide]}
      >
        <View
          style={styles.wrapper}
          {...(Device.isAndroid() ? { collapsable: false } : {})}
        >
          <BrowserUrlBar
            ref={urlBarRef}
            connectionType={connectionType}
            onSubmitEditing={onSubmitEditing}
            onCancel={onCancelUrlBar}
            onFocus={onFocusUrlBar}
            onBlur={hideAutocomplete}
            onChangeText={onChangeUrlBar}
            connectedAccounts={permittedAccountsList}
            activeUrl={resolvedUrlRef.current}
            setIsUrlBarFocused={setIsUrlBarFocused}
            isUrlBarFocused={isUrlBarFocused}
          />
          <View style={styles.wrapper}>
            {renderProgressBar()}
            <View style={styles.webview}>
              {!!entryScriptWeb3 && firstUrlLoaded && (
                <>
                  <WebView
                    originWhitelist={[
                      'https://',
                      'http://',
                      'metamask://',
                      'dapp://',
                      'wc://',
                      'ethereum://',
                      'file://',
                      // Needed for Recaptcha
                      'about:srcdoc',
                    ]}
                    decelerationRate={'normal'}
                    ref={webviewRef}
                    renderError={() => (
                      <WebviewErrorComponent
                        error={error}
                        returnHome={returnHome}
                      />
                    )}
                    source={{
                      uri: allowedInitialUrl,
                      ...(isExternalLink ? { headers: { Cookie: '' } } : null),
                    }}
                    injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
                    style={styles.webview}
                    onLoadStart={handleWebviewNavigationChange(OnLoadStart)}
                    onLoadEnd={handleWebviewNavigationChange(OnLoadEnd)}
                    onLoadProgress={handleWebviewNavigationChange(OnLoadProgress)}
                    onNavigationStateChange={handleOnNavigationStateChange}
                    onMessage={onMessage}
                    onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                    allowsInlineMediaPlayback
                    testID={BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID}
                    applicationNameForUserAgent={'WebView MetaMaskMobile'}
                    onFileDownload={handleOnFileDownload}
                    webviewDebuggingEnabled={isTest}
                  />
                  {ipfsBannerVisible && (
                    <IpfsBanner setIpfsBannerVisible={setIpfsBannerVisible} />
                  )}
                </>
              )}
            </View>
            <UrlAutocomplete
              ref={autocompleteRef}
              onSelect={onSelect}
              onDismiss={onDismissAutocomplete}
            />
          </View>
          {isTabActive && (
            <PhishingModal
              blockedUrl={blockedUrl}
              showPhishingModal={showPhishingModal}
              setShowPhishingModal={setShowPhishingModal}
              setBlockedUrl={setBlockedUrl}
              urlBarRef={urlBarRef}
              addToWhitelist={triggerAddToWhitelist}
              activeUrl={resolvedUrlRef.current}
              blockListType={blockListType}
              goToUrl={onSubmitEditing}
            />
          )}
          {isTabActive && showOptions && (
            <Options
              toggleOptions={toggleOptions}
              onNewTabPress={onNewTabPress}
              toggleOptionsIfNeeded={toggleOptionsIfNeeded}
              activeUrl={resolvedUrlRef.current}
              isHomepage={isHomepage}
              getMaskedUrl={getMaskedUrl}
              onSubmitEditing={onSubmitEditing}
              title={titleRef}
              reload={reload}
              sessionENSNames={sessionENSNamesRef.current}
              favicon={favicon}
              icon={iconRef}
            />
          )}

          {renderBottomBar()}
          {isTabActive && renderOnboardingWizard()}
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
};

const mapStateToProps = (state: RootState) => ({
  bookmarks: state.bookmarks,
  ipfsGateway: selectIpfsGateway(state),
  selectedAddress:
    selectSelectedInternalAccountFormattedAddress(state)?.toLowerCase(),
  isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
  wizardStep: state.wizard.step,
  activeChainId: selectChainId(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  addToBrowserHistory: ({ url, name }: { name: string; url: string }) =>
    dispatch(addToHistory({ url, name })),
  addToWhitelist: (url: string) => dispatch(addToWhitelist(url)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BrowserTab);
