import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Text,
  View,
  TouchableWithoutFeedback,
  Alert,
  Linking,
  BackHandler,
  Platform,
  ImageSourcePropType,
  TextInput,
} from 'react-native';
import { isEqual } from 'lodash';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import Share from 'react-native-share';
import { connect, useSelector } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge/BackgroundBridge';
import Engine from '../../../core/Engine';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import Logger from '../../../util/Logger';
import {
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
import Button from '../../UI/Button';
import { strings } from '../../../../locales/i18n';
import URLParse from 'url-parse';
import WebviewErrorComponent from '../../UI/WebviewError';
import { addBookmark } from '../../../actions/bookmarks';
import { addToHistory, addToWhitelist } from '../../../actions/browser';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import SearchApi from '@metamask/react-native-search-api';
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
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  ADD_FAVORITES_OPTION,
  OPEN_FAVORITES_OPTION,
  MENU_ID,
  NEW_TAB_OPTION,
  OPEN_IN_BROWSER_OPTION,
  RELOAD_OPTION,
  SHARE_OPTION,
} from '../../../../wdio/screen-objects/testIDs/BrowserScreen/OptionMenu.testIds';
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
  HOMEPAGE_URL,
  MM_MIXPANEL_TOKEN,
} from './constants';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import CLText from '../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../component-library/components/Texts/Text';
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
} from './types';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  WebViewNavigationEvent,
  WebViewErrorEvent,
  WebViewError,
  WebViewProgressEvent,
} from '@metamask/react-native-webview/lib/WebViewTypes';
import PhishingModal from './components/PhishingModal';
import BrowserUrlBar from '../../UI/BrowserUrlBar';
import { getMaskedUrl, isENSUrl, processUrlForBrowser } from './utils';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import UrlAutocomplete, { UrlAutocompleteRef } from '../../UI/UrlAutocomplete';

// Update the declaration
const sessionENSNames: SessionENSNames = {};

const ensIgnoreList: string[] = [];

// Update the component definition
export const BrowserTab: React.FC<BrowserTabProps> = (props) => {
  // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { styles } = useStyles(styleSheet, {});
  const [backEnabled, setBackEnabled] = useState(false);
  const [forwardEnabled, setForwardEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [initialUrl, setInitialUrl] = useState('');
  const [firstUrlLoaded, setFirstUrlLoaded] = useState(false);
  const [error, setError] = useState<boolean | WebViewError>(false);
  const [showOptions, setShowOptions] = useState(false);
  const [entryScriptWeb3, setEntryScriptWeb3] = useState<string>();
  const [showPhishingModal, setShowPhishingModal] = useState(false);
  const [blockedUrl, setBlockedUrl] = useState<string>();
  const [ipfsBannerVisible, setIpfsBannerVisible] = useState(false);
  const [isResolvedIpfsUrl, setIsResolvedIpfsUrl] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const blockListType = useRef<string>(''); // TODO: Consider improving this type
  const allowList = useRef<string[]>([]); // TODO: Consider improving this type
  const webStates = useRef<
    Record<string, { requested: boolean; started: boolean; ended: boolean }>
  >({});
  const urlBarRef = useRef<TextInput>(null);
  const urlBarResultsRef = useRef<UrlAutocompleteRef>(null);
  const [isSecureConnection, setIsSecureConnection] = useState(false);

  const activeUrl = useRef('');
  const title = useRef<string>('');
  const icon = useRef<ImageSourcePropType | undefined>();
  const backgroundBridges = useRef<
    {
      url: string;
      hostname: string;
      sendNotification: (payload: unknown) => void;
      onDisconnect: () => void;
      onMessage: (message: Record<string, unknown>) => void;
    }[]
  >([]); // TODO: This type can be improved and updated with typing the BackgroundBridge.js file
  const fromHomepage = useRef(false);
  const wizardScrollAdjusted = useRef(false);
  const permittedAccountsList = useSelector((state: RootState) => {
    const permissionsControllerState = selectPermissionControllerState(state);
    const hostname = new URLParse(activeUrl.current).hostname;
    const permittedAcc = getPermittedAccountsByHostname(
      permissionsControllerState,
      hostname,
    );
    return permittedAcc;
  }, isEqual);

  const favicon = useFavicon(activeUrl.current);
  const { trackEvent, isEnabled, getMetaMetricsId, createEventBuilder } =
    useMetrics();
  /**
   * Is the current tab the active tab
   */
  const isTabActive = useSelector(
    (state: RootState) => state.browser.activeTab === props.id,
  );

  const isFocused = useIsFocused();

  /**
   * Checks if a given url or the current url is the homepage
   */
  const isHomepage = useCallback((checkUrl = null) => {
    const currentPage = checkUrl || activeUrl.current;
    const prefixedUrl = prefixUrlWithProtocol(currentPage);
    const { host: currentHost } = getUrlObj(prefixedUrl);
    return (
      currentHost === HOMEPAGE_HOST || currentHost === OLD_HOMEPAGE_URL_HOST
    );
  }, []);

  const notifyAllConnections = useCallback((payload) => {
    const fullHostname = new URLParse(activeUrl.current).hostname;

    // TODO:permissions move permissioning logic elsewhere
    backgroundBridges.current.forEach((bridge) => {
      if (bridge.hostname === fullHostname) {
        bridge.sendNotification(payload);
      }
    });
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
    current && current.goBack();
  }, [backEnabled, toggleOptionsIfNeeded]);

  /**
   * Go forward to the next website in history
   */
  const goForward = async () => {
    if (!forwardEnabled) return;

    toggleOptionsIfNeeded();
    const { current } = webviewRef;
    current?.goForward && current.goForward();
  };

  /**
   * Check if an origin is allowed
   */
  const isAllowedOrigin = useCallback((urlOrigin: string) => {
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
      allowList.current?.includes(urlOrigin) ||
      !phishingControllerTestResult.result
    );
  }, []);

  const isBookmark = () => {
    const { bookmarks } = props;
    const maskedUrl = getMaskedUrl(activeUrl.current, sessionENSNames);
    return bookmarks.some(({ url: bookmark }) => bookmark === maskedUrl);
  };

  /**
   * Show a phishing modal when a url is not allowed
   */
  const handleNotAllowedUrl = (urlOrigin: string) => {
    setBlockedUrl(urlOrigin);
    setTimeout(() => setShowPhishingModal(true), 1000);
  };

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
          chainId: props.chainId,
        });
        if (type === 'ipfs-ns') {
          gatewayUrl = `${props.ipfsGateway}${hash}${pathname || '/'}${
            query || ''
          }`;
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
          ensIgnoreList.push(hostname);
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
    [goBack, props.ipfsGateway, setIpfsBannerVisible, props.chainId],
  );

  const triggerDappViewedEvent = (urlToTrigger: string) => {
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
  };

  /**
   * Go to a url
   */
  const go: (url: string, initialCall?: boolean) => Promise<string | null> =
    useCallback(
      async (goToUrl, initialCall) => {
        setIsResolvedIpfsUrl(false);
        const prefixedUrl = prefixUrlWithProtocol(goToUrl);
        const {
          hostname,
          query,
          pathname,
          origin: urlOrigin,
        } = new URLParse(prefixedUrl);
        let urlToGo = prefixedUrl;
        const isEnsUrl = isENSUrl(goToUrl, ensIgnoreList);
        if (isEnsUrl) {
          // Stop loading webview
          webviewRef.current?.stopLoading();
          try {
            const {
              //@ts-expect-error - TODO: refactor handleIpfContent function
              url: ensUrl,
              //@ts-expect-error - TODO: refactor handleIpfContent function
              type,
              //@ts-expect-error - TODO: refactor handleIpfContent function
              hash,
              //@ts-expect-error - TODO: refactor handleIpfContent function
              reload,
            } = await handleIpfsContent(goToUrl, { hostname, query, pathname });
            if (reload) return go(ensUrl);
            urlToGo = ensUrl;
            sessionENSNames[urlToGo] = { hostname, hash, type };
            setIsResolvedIpfsUrl(true);
          } catch (_) {
            return null;
          }
        }

        if (isAllowedOrigin(urlOrigin)) {
          if (initialCall || !firstUrlLoaded) {
            setInitialUrl(urlToGo);
            setFirstUrlLoaded(true);
          } else {
            webviewRef?.current?.injectJavaScript(
              `(function(){window.location.href = '${sanitizeUrlInput(
                urlToGo,
              )}' })()`,
            );
          }

          // Skip tracking on initial open
          if (!initialCall) {
            triggerDappViewedEvent(urlToGo);
          }

          setProgress(0);
          return prefixedUrl;
        }
        handleNotAllowedUrl(urlToGo);
        return null;
      },
      [firstUrlLoaded, handleIpfsContent, isAllowedOrigin],
    );

  /**
   * Open a new tab
   */
  const openNewTab = useCallback(
    (newTabUrl?: string) => {
      toggleOptionsIfNeeded();
      dismissTextSelectionIfNeeded();
      props.newTab(newTabUrl);
    },
    [dismissTextSelectionIfNeeded, props, toggleOptionsIfNeeded],
  );

  /**
   * Reload current page
   */
  const reload = useCallback(() => {
    const { current } = webviewRef;

    current && current.reload();
    triggerDappViewedEvent(activeUrl.current);
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
    const initialUrlOrHomepage = props.initialUrl || HOMEPAGE_URL;
    go(initialUrlOrHomepage, true);

    const getEntryScriptWeb3 = async () => {
      const entryScriptWeb3Fetched = await EntryScriptWeb3.get();
      setEntryScriptWeb3(entryScriptWeb3Fetched + SPA_urlChangeListener);
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
  const injectHomePageScripts = async (bookmarks?: string[]) => {
    const { current } = webviewRef;
    const analyticsEnabled = isEnabled();
    const disctinctId = await getMetaMetricsId();
    const homepageScripts = `
              window.__mmFavorites = ${JSON.stringify(
                bookmarks || props.bookmarks,
              )};
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

    current?.injectJavaScript(homepageScripts);
  };

  /**
   * Handles state changes for when the url changes
   */
  const changeUrl = async (siteInfo: {
    url: string;
    title: string;
    icon: ImageSourcePropType;
  }) => {
    activeUrl.current = siteInfo.url;
    title.current = siteInfo.title;
    if (siteInfo.icon) icon.current = siteInfo.icon;
  };

  /**
   * Handles state changes for when the url changes
   */
  const changeAddressBar = (siteInfo: {
    title: string;
    url: string;
    icon: ImageSourcePropType;
    canGoBack: boolean;
    canGoForward: boolean;
  }) => {
    setBackEnabled(siteInfo.canGoBack);
    setForwardEnabled(siteInfo.canGoForward);

    isTabActive &&
      navigation.setParams({
        url: getMaskedUrl(siteInfo.url, sessionENSNames),
        icon: siteInfo.icon,
        silent: true,
      });

    props.updateTabInfo(getMaskedUrl(siteInfo.url, sessionENSNames), props.id);

    props.addToBrowserHistory({
      name: siteInfo.title,
      url: getMaskedUrl(siteInfo.url, sessionENSNames),
    });
  };

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

    // Stops normal loading when it's ens, instead call go to be properly set up
    if (isENSUrl(urlToLoad, ensIgnoreList)) {
      go(urlToLoad.replace(regex.urlHttpToHttps, 'https://'));
      return false;
    }

    // Cancel loading the page if we detect its a phishing page
    if (!isAllowedOrigin(urlOrigin)) {
      handleNotAllowedUrl(urlOrigin);
      return false;
    }

    if (!props.isIpfsGatewayEnabled && isResolvedIpfsUrl) {
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
  const onLoadProgress = ({
    nativeEvent: { progress: onLoadProgressProgress },
  }: WebViewProgressEvent) => {
    setProgress(onLoadProgressProgress);
  };

  /**
   * When website finished loading
   */
  const onLoadEnd = ({
    nativeEvent: { url, title, canGoBack, canGoForward },
  }: WebViewNavigationEvent | WebViewErrorEvent) => {
    // Do not update URL unless website has successfully completed loading.
    webStates.current[url] = { ...webStates.current[url], ended: true };
    const { started, ended } = webStates.current[url];
    const incomingOrigin = new URLParse(url).origin;
    const activeOrigin = new URLParse(activeUrl.current).origin;
    if ((started && ended) || incomingOrigin === activeOrigin) {
      delete webStates.current[url];
      // Update navigation bar address with title of loaded url.
      changeUrl({ title, url, icon: favicon });
      changeAddressBar({
        title,
        url,
        icon: favicon,
        canGoBack,
        canGoForward,
      });
      const contentProtocol = getURLProtocol(url);
      const isHttps = contentProtocol === PROTOCOLS.HTTPS;
      setIsSecureConnection(isHttps);
      urlBarRef.current?.setNativeProps({ text: url });
    }
  };

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
        const urlOrigin = new URLParse(nativeEvent.url).origin;
        backgroundBridges.current.forEach((bridge) => {
          const bridgeOrigin = new URLParse(bridge.url).origin;
          bridgeOrigin === urlOrigin && bridge.onMessage(dataParsed);
        });
        return;
      }
    } catch (e: unknown) {
      const onMessageError = e as Error;
      Logger.error(
        onMessageError,
        `Browser::onMessage on ${activeUrl.current}`,
      );
    }
  };

  /**
   * Go to home page, reload if already on homepage
   */
  const goToHomepage = async () => {
    toggleOptionsIfNeeded();
    if (activeUrl.current === HOMEPAGE_URL) return reload();
    await go(HOMEPAGE_URL);
    trackEvent(createEventBuilder(MetaMetricsEvents.DAPP_HOME).build());
  };

  /**
   * Go to favorites page
   */
  const goToFavorites = async () => {
    toggleOptionsIfNeeded();
    if (activeUrl.current === OLD_HOMEPAGE_URL_HOST) return reload();
    await go(OLD_HOMEPAGE_URL_HOST);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_GO_TO_FAVORITES).build(),
    );
  };

  const toggleUrlModal = () => {
    urlBarRef.current?.focus();
  };

  const initializeBackgroundBridge = (
    urlBridge: string,
    isMainFrame: boolean,
  ) => {
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
          url: activeUrl,
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
          // TODO: This properties were missing, and were not optional
          isWalletConnect: false,
          isMMSDK: false,
          analytics: {},
        }),
      isMainFrame,
    });
    backgroundBridges.current.push(newBridge);
  };

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
  const onLoadStart = async ({ nativeEvent }: WebViewNavigationEvent) => {
    // Use URL to produce real url. This should be the actual website that the user is viewing.
    const { origin: urlOrigin } = new URLParse(nativeEvent.url);

    webStates.current[nativeEvent.url] = {
      ...webStates.current[nativeEvent.url],
      started: true,
    };

    // Reset the previous bridges
    backgroundBridges.current.length &&
      backgroundBridges.current.forEach((bridge) => bridge.onDisconnect());

    // Cancel loading the page if we detect its a phishing page
    if (!isAllowedOrigin(urlOrigin)) {
      handleNotAllowedUrl(activeUrl.current); // should this be activeUrl.current instead of url?
      return false;
    }

    sendActiveAccount();

    icon.current = undefined;
    if (isHomepage(nativeEvent.url)) {
      injectHomePageScripts();
    }

    backgroundBridges.current = [];
    initializeBackgroundBridge(urlOrigin, true);
  };

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
    if (props.isIpfsGatewayEnabled) {
      setIpfsBannerVisible(false);
    }
  }, [props.isIpfsGatewayEnabled]);

  /**
   * Allow list updates do not propigate through the useCallbacks this updates a ref that is use in the callbacks
   */
  const updateAllowList = () => {
    allowList.current = props.whitelist;
  };

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
  const onError = ({ nativeEvent: errorInfo }: WebViewErrorEvent) => {
    Logger.log(errorInfo);
    navigation.setParams({
      error: true,
    });
    setError(errorInfo);
  };

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
   * Track add site to favorites event
   */
  const trackAddToFavoritesEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_ADD_FAVORITES)
        .addProperties({
          dapp_name: title.current || '',
        })
        .build(),
    );
  };

  /**
   * Track share site event
   */
  const trackShareEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_SHARE_SITE).build(),
    );
  };

  /**
   * Track reload site event
   */
  const trackReloadEvent = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.BROWSER_RELOAD).build());
  };

  /**
   * Add bookmark
   */
  const navigateToAddBookmark = () => {
    toggleOptionsIfNeeded();
    navigation.push('AddBookmarkView', {
      screen: 'AddBookmark',
      params: {
        title: title.current || '',
        url: getMaskedUrl(activeUrl.current, sessionENSNames),
        onAddBookmark: async ({
          name,
          url: urlToAdd,
        }: {
          name: string;
          url: string;
        }) => {
          props.addBookmark({ name, url: urlToAdd });
          if (Device.isIos()) {
            const item = {
              uniqueIdentifier: activeUrl,
              title: name || getMaskedUrl(urlToAdd, sessionENSNames),
              contentDescription: `Launch ${name || urlToAdd} on MetaMask`,
              keywords: [name.split(' '), urlToAdd, 'dapp'],
              thumbnail: {
                uri: icon.current || favicon,
              },
            };
            try {
              SearchApi.indexSpotlightItem(item);
            } catch (e: unknown) {
              const searchApiError = e as Error;
              Logger.error(searchApiError, 'Error adding to spotlight');
            }
          }
        },
      },
    });
    trackAddToFavoritesEvent();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_ADD_TO_FAVORITE).build(),
    );
  };

  /**
   * Share url
   */
  const share = () => {
    toggleOptionsIfNeeded();
    Share.open({
      url: activeUrl.current,
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
    Linking.openURL(activeUrl.current).catch((openInBrowserError) =>
      Logger.log(
        `Error while trying to open external link: ${activeUrl.current}`,
        openInBrowserError,
      ),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_OPEN_IN_BROWSER).build(),
    );
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
   * Renders Go to Favorites option
   */
  const renderGoToFavorites = () => (
    <Button onPress={goToFavorites} style={styles.option}>
      <View style={styles.optionIconWrapper}>
        <Icon name="star" size={16} style={styles.optionIcon} />
      </View>
      <Text
        style={styles.optionText}
        numberOfLines={2}
        {...generateTestId(Platform, OPEN_FAVORITES_OPTION)}
      >
        {strings('browser.go_to_favorites')}
      </Text>
    </Button>
  );

  /**
   * Render non-homepage options menu
   */
  const renderNonHomeOptions = () => {
    if (isHomepage()) return renderGoToFavorites();

    return (
      <React.Fragment>
        <Button onPress={onReloadPress} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="refresh" size={15} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, RELOAD_OPTION)}
          >
            {strings('browser.reload')}
          </Text>
        </Button>
        {!isBookmark() && (
          <Button onPress={navigateToAddBookmark} style={styles.option}>
            <View style={styles.optionIconWrapper}>
              <Icon name="plus-square" size={16} style={styles.optionIcon} />
            </View>
            <Text
              style={styles.optionText}
              numberOfLines={2}
              {...generateTestId(Platform, ADD_FAVORITES_OPTION)}
            >
              {strings('browser.add_to_favorites')}
            </Text>
          </Button>
        )}
        {renderGoToFavorites()}
        <Button onPress={share} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="share" size={15} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, SHARE_OPTION)}
          >
            {strings('browser.share')}
          </Text>
        </Button>
        <Button onPress={openInBrowser} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="expand" size={16} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, OPEN_IN_BROWSER_OPTION)}
          >
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
              {...generateTestId(Platform, MENU_ID)}
            >
              <Button onPress={onNewTabPress} style={styles.option}>
                <View style={styles.optionIconWrapper}>
                  <MaterialCommunityIcon
                    name="plus"
                    size={18}
                    style={styles.optionIcon}
                  />
                </View>
                <Text
                  style={styles.optionText}
                  numberOfLines={1}
                  {...generateTestId(Platform, NEW_TAB_OPTION)}
                >
                  {strings('browser.new_tab')}
                </Text>
              </Button>
              {renderNonHomeOptions()}
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
    if ([7].includes(wizardStep)) {
      if (!wizardScrollAdjusted.current) {
        setTimeout(() => {
          reload();
        }, 1);
        wizardScrollAdjusted.current = true;
      }
      return <OnboardingWizard navigation={navigation} />;
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

  const renderIpfsBanner = () => (
    <View style={styles.bannerContainer}>
      <Banner
        title={strings('ipfs_gateway_banner.ipfs_gateway_banner_title')}
        description={
          <CLText>
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content1')}{' '}
            <CLText variant={TextVariant.BodyMDBold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content2')}
            </CLText>{' '}
            {strings('ipfs_gateway_banner.ipfs_gateway_banner_content3')}{' '}
            <CLText variant={TextVariant.BodyMDBold}>
              {strings('ipfs_gateway_banner.ipfs_gateway_banner_content4')}
            </CLText>
          </CLText>
        }
        actionButtonProps={{
          variant: ButtonVariants.Link,
          onPress: () =>
            navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
              screen: Routes.SHEET.SHOW_IPFS,
              params: {
                setIpfsBannerVisible: () => setIpfsBannerVisible(false),
              },
            }),
          label: 'Turn on IPFS gateway',
        }}
        variant={BannerVariant.Alert}
        severity={BannerAlertSeverity.Info}
        onClose={() => setIpfsBannerVisible(false)}
      />
    </View>
  );

  const isExternalLink = useMemo(
    () => props.linkType === EXTERNAL_LINK_TYPE,
    [props.linkType],
  );

  const checkTabPermissions = useCallback(() => {
    if (!activeUrl.current) return;

    const hostname = new URLParse(activeUrl.current).hostname;
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

        const currentChainId = props.chainId;
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
  }, [props.chainId, navigation]);

  useEffect(() => {
    if (
      isMultichainVersion1Enabled &&
      isFocused &&
      !props.isInTabsView &&
      isTabActive
    ) {
      checkTabPermissions();
    }
  }, [checkTabPermissions, isFocused, props.isInTabsView, isTabActive]);

  const onSubmitEditing = (text: string) => {
    //TODO: Sanitize input
    //       const { defaultProtocol, searchEngine } = props;
    //       const sanitizedInput = onUrlSubmit(
    //         inputValue,
    //         searchEngine,
    //         defaultProtocol ?? 'https://',
    //       );
    webviewRef.current?.stopLoading();
    // Format url for browser to be navigatable by webview
    const processedUrl = processUrlForBrowser(text);
    // Directly update url in webview
    webviewRef.current?.injectJavaScript(`
      window.location.href = '${processedUrl}';
      true;  // Required for iOS
    `);
  };

  const onDismissAutocomplete = () => {
    // Unfocus the url bar and hide the autocomplete results
    urlBarRef.current?.blur();
  };

  const onCancel = () => {
    // Reset the url bar to the current url
    urlBarRef.current?.setNativeProps({ text: activeUrl.current });
  };

  const onFocusUrlBar = () => {
    // Show the autocomplete results
    urlBarResultsRef.current?.show();
  };

  const onBlurUrlBar = () => {
    // Hide the autocomplete results
    urlBarResultsRef.current?.hide();
  };

  const onChangeUrlBar = (text: string) =>
    // Search the autocomplete results
    urlBarResultsRef.current?.search(text);

  /**
   * Main render
   */
  return (
    <ErrorBoundary navigation={navigation} view="BrowserTab">
      <View
        style={[styles.wrapper, !isTabActive && styles.hide]}
        {...(Device.isAndroid() ? { collapsable: false } : {})}
      >
        <BrowserUrlBar
          ref={urlBarRef}
          isSecureConnection={isSecureConnection}
          onSubmitEditing={onSubmitEditing}
          onCancel={onCancel}
          onFocus={onFocusUrlBar}
          onBlur={onBlurUrlBar}
          onChangeText={onChangeUrlBar}
          connectedAccounts={permittedAccountsList}
          activeUrlRef={activeUrl}
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
                    uri: initialUrl,
                    ...(isExternalLink ? { headers: { Cookie: '' } } : null),
                  }}
                  injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
                  style={styles.webview}
                  onLoadStart={onLoadStart}
                  onLoadEnd={onLoadEnd}
                  onLoadProgress={onLoadProgress}
                  onMessage={onMessage}
                  onError={onError}
                  onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
                  allowsInlineMediaPlayback
                  testID={BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID}
                  applicationNameForUserAgent={'WebView MetaMaskMobile'}
                  onFileDownload={handleOnFileDownload}
                  webviewDebuggingEnabled={isTest}
                />
                {ipfsBannerVisible && renderIpfsBanner()}
              </>
            )}
          </View>
          <UrlAutocomplete
            ref={urlBarResultsRef}
            onSubmit={onSubmitEditing}
            onDismiss={onDismissAutocomplete}
          />
        </View>
        {updateAllowList()}
        {isTabActive && (
          <PhishingModal
            blockedUrl={blockedUrl}
            showPhishingModal={showPhishingModal}
            setShowPhishingModal={setShowPhishingModal}
            setBlockedUrl={setBlockedUrl}
            go={go}
            urlBarRef={urlBarRef}
            addToWhitelist={props.addToWhitelist}
            activeUrl={activeUrl}
            blockListType={blockListType}
            onSubmitEditing={onSubmitEditing}
          />
        )}
        {isTabActive && renderOptions()}

        {isTabActive && renderBottomBar()}
        {isTabActive && renderOnboardingWizard()}
      </View>
    </ErrorBoundary>
  );
};

const mapStateToProps = (state: RootState) => ({
  bookmarks: state.bookmarks,
  ipfsGateway: selectIpfsGateway(state),
  selectedAddress:
    selectSelectedInternalAccountFormattedAddress(state)?.toLowerCase(),
  isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
  searchEngine: state.settings.searchEngine,
  whitelist: state.browser.whitelist,
  wizardStep: state.wizard.step,
  chainId: selectChainId(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  addBookmark: (bookmark: { name: string; url: string }) =>
    dispatch(addBookmark(bookmark)),
  addToBrowserHistory: ({ url, name }: { name: string; url: string }) =>
    dispatch(addToHistory({ url, name })),
  addToWhitelist: (url: string) => dispatch(addToWhitelist(url)),
});

export default connect(mapStateToProps, mapDispatchToProps)(BrowserTab);
