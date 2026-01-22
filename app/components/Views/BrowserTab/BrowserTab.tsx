import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Alert,
  BackHandler,
  ImageSourcePropType,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { isEqual } from 'lodash';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  withTiming,
  runOnJS,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
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
  SCROLL_TRACKER_SCRIPT,
} from '../../../util/browserScripts';
import resolveEnsToIpfsContentId from '../../../lib/ens-ipfs/resolver';
import { strings } from '../../../../locales/i18n';
import URLParse from 'url-parse';
import WebviewErrorComponent from '../../UI/WebviewError';
import {
  addToHistory,
  addToWhitelist,
  toggleFullscreen,
} from '../../../actions/browser';
import Device from '../../../util/device';
import AppConstants from '../../../core/AppConstants';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import ErrorBoundary from '../ErrorBoundary';
import { getRpcMethodMiddleware } from '../../../core/RPCMethods/RPCMethodMiddleware';
import downloadFile from '../../../util/browser/downloadFile';
import { MAX_MESSAGE_LENGTH } from '../../../constants/dapp';
import sanitizeUrlInput from '../../../util/url/sanitizeUrlInput';
import {
  getPermittedCaipAccountIdsByHostname,
  getPermittedEvmAddressesByHostname,
  sortMultichainAccountsByLastSelected,
} from '../../../core/Permissions';
import Routes from '../../../constants/navigation/Routes';
import { isInternalDeepLink } from '../../../util/deeplinks';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/DeeplinkManager';
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
import { selectEvmChainId } from '../../../selectors/networkController';
import { BrowserViewSelectorsIDs } from './BrowserView.testIds';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { trackDappViewedEvent } from '../../../util/metrics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import { selectPermissionControllerState } from '../../../selectors/snaps/permissionController';
import { isTest } from '../../../util/test/utils.js';
import { EXTERNAL_LINK_TYPE } from '../../../constants/browser';
import { useNavigation } from '@react-navigation/native';
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
} from '@metamask/react-native-webview/src/WebViewTypes';
import PhishingModal from './components/PhishingModal';
import BrowserUrlBar, {
  ConnectionType,
  BrowserUrlBarRef,
} from '../../UI/BrowserUrlBar';
import { getMaskedUrl, isENSUrl } from './utils';
import { getURLProtocol } from '../../../util/general';
import { PROTOCOLS } from '../../../constants/deeplinks';
import IpfsBanner from './components/IpfsBanner';
import UrlAutocomplete, {
  AutocompleteSearchResult,
  UrlAutocompleteRef,
} from '../../UI/UrlAutocomplete';
import { selectSearchEngine } from '../../../reducers/browser/selectors';
import {
  getPhishingTestResult,
  getPhishingTestResultAsync,
  isProductSafetyDappScanningEnabled,
} from '../../../util/phishingDetection';
import { parseCaipAccountId } from '@metamask/utils';
import { selectBrowserFullscreen } from '../../../selectors/browser';
import { selectAssetsTrendingTokensEnabled } from '../../../selectors/featureFlagController/assetsTrendingTokens';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';

/**
 * Tab component for the in-app browser
 */
export const BrowserTab: React.FC<BrowserTabProps> = React.memo(
  ({
    id: tabId,
    isIpfsGatewayEnabled,
    addToWhitelist: triggerAddToWhitelist,
    showTabs,
    linkType,
    updateTabInfo,
    addToBrowserHistory,
    bookmarks,
    initialUrl,
    ipfsGateway,
    newTab,
    activeChainId,
    fromTrending,
    fromPerps,
  }) => {
    // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigation = useNavigation<StackNavigationProp<any>>();
    const { styles, theme } = useStyles(styleSheet, {});
    const [backEnabled, setBackEnabled] = useState(false);
    const [forwardEnabled, setForwardEnabled] = useState(false);
    const [progress, setProgress] = useState(0);
    const [firstUrlLoaded, setFirstUrlLoaded] = useState(false);
    const [error, setError] = useState<boolean | WebViewError>(false);
    const [entryScriptWeb3, setEntryScriptWeb3] = useState<string>();
    const [showPhishingModal, setShowPhishingModal] = useState(false);
    const [blockedUrl, setBlockedUrl] = useState<string>();
    const [ipfsBannerVisible, setIpfsBannerVisible] = useState(false);
    const [isResolvedIpfsUrl, setIsResolvedIpfsUrl] = useState(false);
    const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);
    const [connectionType, setConnectionType] = useState(
      ConnectionType.UNKNOWN,
    );
    const webviewRef = useRef<WebView>(null);
    const webStates = useRef<
      Record<string, { requested: boolean; started: boolean; ended: boolean }>
    >({});
    // Track if webview is loaded for the first time
    const isWebViewReadyToLoad = useRef(false);

    /**
     * GESTURE NAVIGATION SYSTEM
     *
     * Two approaches available (controlled by USE_UNIFIED_GESTURE flag):
     *
     * UNIFIED APPROACH (USE_UNIFIED_GESTURE = true):
     * - Single Pan gesture that works simultaneously with WebView's native scrolling
     * - Uses Gesture.Native() + simultaneousWithExternalGesture()
     * - Detects gesture type based on touch origin position
     * - Cleaner component tree, no overlay views needed
     *
     * OVERLAY APPROACH (USE_UNIFIED_GESTURE = false - fallback):
     * - Three separate GestureDetectors with transparent overlay zones
     * - More reliable but requires extra View components
     * - Edge swipes: 20px wide zones on left/right edges
     * - Pull zone: Full-width 100px zone at top
     *
     * Both approaches implement:
     * 1. Left edge swipe (horizontal) → Go back in history
     * 2. Right edge swipe (horizontal) → Go forward in history
     * 3. Pull-to-refresh (vertical, top only) → Reload current page
     */

    // Feature flag to toggle between unified and overlay gesture approaches
    const USE_UNIFIED_GESTURE = true;

    // Gesture constants
    const EDGE_THRESHOLD = 20; // pixels from edge to trigger
    const SWIPE_THRESHOLD = 0.3; // 30% of screen width to complete swipe
    const PULL_THRESHOLD = 80; // pixels to trigger refresh
    const PULL_OVERLAY_HEIGHT = 100; // Height of pull zone at top
    const SCROLL_TOP_THRESHOLD = 5; // Threshold for "at top" detection (Android WebView quirk)
    const screenWidth = Dimensions.get('window').width;

    // Gesture state
    const [isAtTop, setIsAtTop] = useState(true); // Tracks if WebView is scrolled to top
    const [isRefreshing, setIsRefreshing] = useState(false); // Pull-to-refresh in progress
    const [shouldRefresh, setShouldRefresh] = useState(false); // State trigger for refresh
    const pullDistanceRef = useRef<number>(0); // Track pull distance for analytics
    const scrollY = useSharedValue(0); // Current scroll position from WebView
    const pullProgress = useSharedValue(0); // Pull animation progress (0-1.5)
    const isPulling = useSharedValue(false); // Pull gesture active state
    const swipeStartTime = useRef<number>(0);
    const swipeProgress = useSharedValue(0);
    const swipeDirection = useSharedValue<'back' | 'forward' | null>(null);

    // Unified gesture approach - additional state for pull-to-refresh
    const gestureType = useSharedValue<'back' | 'forward' | 'refresh' | null>(
      null,
    ); // Active gesture type (used for pull-to-refresh)
    const urlBarRef = useRef<BrowserUrlBarRef>(null);
    const autocompleteRef = useRef<UrlAutocompleteRef>(null);
    const onSubmitEditingRef = useRef<(text: string) => Promise<void>>(
      async () => {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
      },
    );
    //const [resolvedUrl, setResolvedUrl] = useState('');
    const resolvedUrlRef = useRef('');
    // Tracks currently loading URL to prevent phishing alerts when user navigates away from malicious sites before detection completes
    const loadingUrlRef = useRef('');
    const submittedUrlRef = useRef('');
    const titleRef = useRef<string>('');
    const iconRef = useRef<ImageSourcePropType | undefined>();
    const sessionENSNamesRef = useRef<SessionENSNames>({});
    const ensIgnoreListRef = useRef<string[]>([]);
    const backgroundBridgeRef = useRef<{
      url: string;
      sendNotificationEip1193: (payload: unknown) => void;
      onDisconnect: () => void;
      onMessage: (message: Record<string, unknown>) => void;
    }>();
    const fromHomepage = useRef(false);
    const searchEngine = useSelector(selectSearchEngine);
    const isAssetsTrendingTokensEnabled = useSelector(
      selectAssetsTrendingTokensEnabled,
    );

    const permittedEvmAccountsList = useSelector((state: RootState) => {
      const permissionsControllerState = selectPermissionControllerState(state);
      const hostname = new URLParse(resolvedUrlRef.current).origin;
      const permittedAcc = getPermittedEvmAddressesByHostname(
        permissionsControllerState,
        hostname,
      );
      return permittedAcc;
    }, isEqual);
    const permittedCaipAccountAddressesList = useSelector(
      (state: RootState) => {
        const permissionsControllerState =
          selectPermissionControllerState(state);
        const hostname = new URLParse(resolvedUrlRef.current).origin;
        const permittedAccountIds = getPermittedCaipAccountIdsByHostname(
          permissionsControllerState,
          hostname,
        );
        const sortedPermittedAccountIds =
          sortMultichainAccountsByLastSelected(permittedAccountIds);
        const permittedAccountAddresses = sortedPermittedAccountIds.map(
          (accountId) => {
            const { address } = parseCaipAccountId(accountId);
            return address;
          },
        );
        return permittedAccountAddresses;
      },
      isEqual,
    );

    const { faviconURI: favicon } = useFavicon(resolvedUrlRef.current);
    const { isEnabled, getMetaMetricsId, trackEvent, createEventBuilder } =
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
    const whitelist = useSelector(
      (state: RootState) => state.browser.whitelist,
    );

    /**
     * Checks if a given url or the current url is the homepage
     */
    const isHomepage = useCallback((checkUrl?: string | null) => {
      const currentPage = checkUrl || resolvedUrlRef.current;
      const prefixedUrl = prefixUrlWithProtocol(currentPage);
      const { host: currentHost } = getUrlObj(prefixedUrl);
      return (
        currentHost === HOMEPAGE_HOST || currentHost === OLD_HOMEPAGE_URL_HOST
      );
    }, []);

    const notifyAllConnections = useCallback((payload: unknown) => {
      backgroundBridgeRef.current?.sendNotificationEip1193(payload);
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
     * Go back to previous website in history
     */
    const goBack = useCallback(() => {
      if (!backEnabled) return;

      const { current } = webviewRef;
      if (!current) {
        Logger.log('WebviewRef current is not defined!');
      }
      // Reset error state
      setError(false);
      current?.goBack?.();
    }, [backEnabled]);

    /**
     * Go forward to the next website in history
     */
    const goForward = useCallback(async () => {
      if (!forwardEnabled) return;

      const { current } = webviewRef;
      current?.goForward?.();
    }, [forwardEnabled]);

    /**
     * Trigger haptic feedback
     * Used for all gesture interactions (swipe navigation + pull-to-refresh)
     */
    const triggerHapticFeedback = useCallback((style: ImpactFeedbackStyle) => {
      impactAsync(style);
    }, []);

    /**
     * Handle swipe navigation gesture completion
     * Triggers WebView navigation and tracks analytics for horizontal edge swipes
     */
    const handleSwipeNavigation = useCallback(
      (direction: 'back' | 'forward', distance: number, duration: number) => {
        if (direction === 'back' && backEnabled) {
          goBack();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.BROWSER_SWIPE_BACK)
              .addProperties({
                swipe_distance: distance,
                swipe_duration: duration,
              })
              .build(),
          );
          triggerHapticFeedback(ImpactFeedbackStyle.Medium);
        } else if (direction === 'forward' && forwardEnabled) {
          goForward();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.BROWSER_SWIPE_FORWARD)
              .addProperties({
                swipe_distance: distance,
                swipe_duration: duration,
              })
              .build(),
          );
          triggerHapticFeedback(ImpactFeedbackStyle.Medium);
        }
      },
      [
        backEnabled,
        forwardEnabled,
        goBack,
        goForward,
        trackEvent,
        createEventBuilder,
        triggerHapticFeedback,
      ],
    );

    /**
     * Reset swipe animation state
     * Returns swipe progress indicator to 0 with smooth animation
     */
    const resetSwipeAnimation = useCallback(() => {
      swipeProgress.value = withTiming(0, { duration: 200 });
      swipeDirection.value = null;
    }, [swipeProgress, swipeDirection]);

    /**
     * Reset pull animation state
     * Returns pull progress indicator to 0 with smooth animation
     */
    const resetPullAnimation = useCallback(() => {
      pullProgress.value = withTiming(0, { duration: 200 });
      isPulling.value = false;
    }, [pullProgress, isPulling]);

    /**
     * Check if gestures should be enabled
     * Disables all gestures when URL bar is focused or page is loading
     */
    const areGesturesEnabled = useMemo(
      () => isTabActive && !isUrlBarFocused && firstUrlLoaded,
      [isTabActive, isUrlBarFocused, firstUrlLoaded],
    );

    /**
     * UNIFIED GESTURE APPROACH
     *
     * Uses Gesture.Native() to work with WebView's internal touch handling
     * and a single unified Pan gesture with simultaneousWithExternalGesture.
     * Gesture type is determined by the touch origin position in onStart.
     */

    /**
     * Native gesture for WebView - represents WebView's internal scrolling
     * Required for simultaneousWithExternalGesture to work properly
     */
    const webViewNativeGesture = useMemo(() => Gesture.Native(), []);

    /**
     * FULLY UNIFIED GESTURE using manualActivation
     *
     * This approach uses manualActivation(true) to manually control when the
     * gesture activates based on touch position. This allows us to:
     * 1. Check touch position in onTouchesDown
     * 2. Activate the gesture ONLY for edge swipes or pull-to-refresh zones
     * 3. Fail the gesture for other touches, letting WebView handle them
     *
     * This is the most promising approach for a true unified gesture solution.
     *
     * IMPORTANT: We use scrollY.value (shared value) instead of isAtTop (React state)
     * to check scroll position. Shared values are accessible in worklets in real-time,
     * while React state may be stale when the gesture fires.
     */
    const fullyUnifiedGesture = useMemo(
      () =>
        Gesture.Pan()
          .manualActivation(true)
          .onTouchesDown((event, stateManager) => {
            'worklet';
            if (!areGesturesEnabled) {
              stateManager.fail();
              return;
            }

            const touch = event.allTouches[0];
            if (!touch) {
              stateManager.fail();
              return;
            }

            const { x, y } = touch;

            // Check if touch is in a gesture zone
            // Use scrollY.value (shared value) for real-time scroll position check
            // This is more reliable than React state which may be stale in worklets
            const isLeftEdge = x < EDGE_THRESHOLD && backEnabled;
            const isRightEdge =
              x > screenWidth - EDGE_THRESHOLD && forwardEnabled;
            const currentlyAtTop = scrollY.value <= SCROLL_TOP_THRESHOLD;
            const isTopZone =
              y < PULL_OVERLAY_HEIGHT && currentlyAtTop && !isRefreshing;

            if (isLeftEdge) {
              // Left edge - prepare for back gesture
              gestureType.value = 'back';
              swipeDirection.value = 'back';
              swipeProgress.value = 0;
              swipeStartTime.current = Date.now();
              stateManager.activate();
              runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
            } else if (isRightEdge) {
              // Right edge - prepare for forward gesture
              gestureType.value = 'forward';
              swipeDirection.value = 'forward';
              swipeProgress.value = 0;
              swipeStartTime.current = Date.now();
              stateManager.activate();
              runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
            } else if (isTopZone) {
              // Top zone - prepare for pull-to-refresh
              gestureType.value = 'refresh';
              isPulling.value = true;
              pullProgress.value = 0;
              stateManager.activate();
              runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
            } else {
              // Not in a gesture zone - let WebView handle it
              stateManager.fail();
            }
          })
          .onUpdate((event) => {
            'worklet';
            const currentGestureType = gestureType.value;
            if (!currentGestureType) return;

            const swipeDistance = screenWidth * SWIPE_THRESHOLD;

            if (currentGestureType === 'back' && event.translationX > 0) {
              // Rightward swipe for back navigation
              swipeProgress.value = Math.min(
                event.translationX / swipeDistance,
                1,
              );
            } else if (
              currentGestureType === 'forward' &&
              event.translationX < 0
            ) {
              // Leftward swipe for forward navigation
              swipeProgress.value = Math.min(
                Math.abs(event.translationX) / swipeDistance,
                1,
              );
            } else if (
              currentGestureType === 'refresh' &&
              event.translationY > 0
            ) {
              // Downward pull for refresh
              pullProgress.value = Math.min(
                event.translationY / PULL_THRESHOLD,
                1.5,
              );
            }
          })
          .onEnd((event) => {
            'worklet';
            const currentGestureType = gestureType.value;
            if (!currentGestureType) {
              runOnJS(resetSwipeAnimation)();
              runOnJS(resetPullAnimation)();
              return;
            }

            const swipeDistance = screenWidth * SWIPE_THRESHOLD;
            const duration = Date.now() - swipeStartTime.current;

            if (currentGestureType === 'back') {
              // Trigger back if threshold met
              if (event.translationX >= swipeDistance) {
                runOnJS(handleSwipeNavigation)(
                  'back',
                  event.translationX,
                  duration,
                );
              }
              runOnJS(resetSwipeAnimation)();
            } else if (currentGestureType === 'forward') {
              // Trigger forward if threshold met
              if (event.translationX <= -swipeDistance) {
                runOnJS(handleSwipeNavigation)(
                  'forward',
                  Math.abs(event.translationX),
                  duration,
                );
              }
              runOnJS(resetSwipeAnimation)();
            } else if (currentGestureType === 'refresh') {
              // Trigger refresh if threshold met
              if (event.translationY >= PULL_THRESHOLD) {
                pullDistanceRef.current = event.translationY;
                runOnJS(setShouldRefresh)(true);
              }
              runOnJS(resetPullAnimation)();
            }

            gestureType.value = null;
          })
          .onFinalize(() => {
            'worklet';
            gestureType.value = null;
            isPulling.value = false;
            runOnJS(resetSwipeAnimation)();
            runOnJS(resetPullAnimation)();
          }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        areGesturesEnabled,
        backEnabled,
        forwardEnabled,
        // Note: We use scrollY.value (shared value) instead of isAtTop for real-time
        // scroll position checking in the worklet. Shared values don't need to be deps.
        isRefreshing,
        screenWidth,
        triggerHapticFeedback,
        handleSwipeNavigation,
        resetSwipeAnimation,
        resetPullAnimation,
      ],
    );

    /**
     * Combined gesture for WebView - uses the fully unified gesture
     * with manualActivation that handles all three gesture types
     */
    const combinedWebViewGesture = useMemo(
      () => Gesture.Simultaneous(webViewNativeGesture, fullyUnifiedGesture),
      [webViewNativeGesture, fullyUnifiedGesture],
    );

    /**
     * OVERLAY GESTURE APPROACH (Fallback)
     *
     * Three separate Pan gestures handle different navigation types:
     * 1. leftEdgeGesture - Horizontal right-swipe from left 20px edge
     * 2. rightEdgeGesture - Horizontal left-swipe from right 20px edge
     * 3. pullToRefreshGesture - Vertical down-pull from top 100px zone
     *
     * Each gesture is attached to its own transparent overlay zone positioned
     * absolutely above the WebView to intercept touches before WebView consumes them.
     */

    /**
     * Pan gesture handler for left edge (back navigation)
     * Detects right-swipe starting from left 20px edge
     */
    const leftEdgeGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([10, 1000]) // Only trigger on right swipe
          .failOffsetY([-50, 50])
          .onStart(() => {
            swipeDirection.value = 'back';
            swipeProgress.value = 0;
            swipeStartTime.current = Date.now();
            runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          })
          .onUpdate((event) => {
            const translationX = event.translationX;
            // Only track positive (rightward) movement for back
            if (translationX < 0) return;

            const maxSwipeDistance = screenWidth * SWIPE_THRESHOLD;
            const swipeProgressValue = Math.min(
              translationX / maxSwipeDistance,
              1,
            );
            swipeProgress.value = swipeProgressValue;
          })
          .onEnd((event) => {
            const translationX = event.translationX;
            const swipeDistance = screenWidth * SWIPE_THRESHOLD;
            const duration = Date.now() - swipeStartTime.current;

            if (translationX >= swipeDistance) {
              runOnJS(handleSwipeNavigation)('back', translationX, duration);
            }

            runOnJS(resetSwipeAnimation)();
          })
          .onFinalize(() => {
            runOnJS(resetSwipeAnimation)();
          }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        screenWidth,
        triggerHapticFeedback,
        resetSwipeAnimation,
        handleSwipeNavigation,
      ],
    );

    /**
     * Pan gesture handler for right edge (forward navigation)
     * Detects left-swipe starting from right 20px edge
     */
    const rightEdgeGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetX([-1000, -10]) // Only trigger on left swipe
          .failOffsetY([-50, 50])
          .onStart(() => {
            swipeDirection.value = 'forward';
            swipeProgress.value = 0;
            swipeStartTime.current = Date.now();
            runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          })
          .onUpdate((event) => {
            const translationX = event.translationX;
            // Only track negative (leftward) movement for forward
            if (translationX > 0) return;

            const maxSwipeDistance = screenWidth * SWIPE_THRESHOLD;
            const swipeProgressValue = Math.min(
              Math.abs(translationX) / maxSwipeDistance,
              1,
            );
            swipeProgress.value = swipeProgressValue;
          })
          .onEnd((event) => {
            const translationX = event.translationX;
            const swipeDistance = screenWidth * SWIPE_THRESHOLD;
            const duration = Date.now() - swipeStartTime.current;

            if (translationX <= -swipeDistance) {
              runOnJS(handleSwipeNavigation)(
                'forward',
                Math.abs(translationX),
                duration,
              );
            }

            runOnJS(resetSwipeAnimation)();
          })
          .onFinalize(() => {
            runOnJS(resetSwipeAnimation)();
          }),
      [
        screenWidth,
        triggerHapticFeedback,
        resetSwipeAnimation,
        handleSwipeNavigation,
        swipeDirection,
        swipeProgress,
      ],
    );

    /**
     * Pan gesture handler for pull-to-refresh (vertical pull from top)
     * Only activates when WebView is scrolled to top (isAtTop === true)
     * Uses state-driven refresh trigger to avoid runOnJS crashes
     */
    const pullToRefreshGesture = useMemo(
      () =>
        Gesture.Pan()
          .activeOffsetY([10, 1000]) // Only downward pulls (prevents upward scroll interference)
          .failOffsetX([-20, 20]) // Fail if too much horizontal movement (prevents conflicts with edge swipes)
          .onStart(() => {
            if (!isAtTop || isRefreshing) return;
            isPulling.value = true;
            pullProgress.value = 0;
            runOnJS(triggerHapticFeedback)(ImpactFeedbackStyle.Light);
          })
          .onUpdate((event) => {
            if (!isPulling.value) return;
            const translationY = event.translationY;
            if (translationY < 0) return; // Only downward movement

            pullProgress.value = Math.min(translationY / PULL_THRESHOLD, 1.5);
          })
          .onEnd((event) => {
            'worklet';
            if (!isPulling.value) {
              runOnJS(resetPullAnimation)();
              return;
            }

            const translationY = event.translationY;
            if (translationY >= PULL_THRESHOLD) {
              // Store distance for analytics before triggering refresh
              pullDistanceRef.current = translationY;
              runOnJS(setShouldRefresh)(true);
            }
            runOnJS(resetPullAnimation)();
          })
          .onFinalize(() => {
            isPulling.value = false;
            runOnJS(resetPullAnimation)();
          }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isAtTop, isRefreshing, triggerHapticFeedback, resetPullAnimation],
    );

    /**
     * Check if an origin is allowed
     */
    const isAllowedOrigin = useCallback(
      async (urlOrigin: string): Promise<boolean> => {
        if (whitelist?.includes(urlOrigin)) {
          return true;
        }

        const testResult = await getPhishingTestResultAsync(urlOrigin);
        return !testResult?.result;
      },
      [whitelist],
    );

    /**
     * Determines if we should show the phishing modal for a detected phishing URL
     * For real-time dapp scanning, we may want to skip showing the modal in certain cases:
     * - The user has completely navigated and loaded web content for another website
     * - The user has started navigating and loading web content for another website
     *
     * This is important because if we've navigated to something like metamask.io after being on
     * a phishing website and the response from the dapp scanning API returns after we've already
     * navigated away on the phishing website, then the user thinks the modal is for metamask.io.
     */
    const shouldShowPhishingModal = useCallback(
      (phishingUrlOrigin: string): boolean => {
        if (!isProductSafetyDappScanningEnabled()) {
          return true;
        }
        const resolvedUrlOrigin = new URLParse(resolvedUrlRef.current).origin;
        const loadingUrlOrigin = new URLParse(loadingUrlRef.current).origin;
        const shouldNotShow =
          resolvedUrlOrigin !== phishingUrlOrigin &&
          loadingUrlOrigin !== phishingUrlOrigin &&
          loadingUrlOrigin !== 'null';

        return !shouldNotShow;
      },
      [resolvedUrlRef, loadingUrlRef],
    );

    /**
     * Show a phishing modal when a url is not allowed
     */
    const handleNotAllowedUrl = useCallback(
      (urlOrigin: string) => {
        if (!shouldShowPhishingModal(urlOrigin)) {
          return;
        }

        setBlockedUrl(urlOrigin);
        setTimeout(() => setShowPhishingModal(true), 1000);
      },
      [shouldShowPhishingModal, setBlockedUrl, setShowPhishingModal],
    );

    /**
     * Get IPFS info from a ens url
     * TODO: Consider improving this function and it's types
     */
    const handleIpfsContent = useCallback(
      async (
        fullUrl: string,
        {
          hostname,
          pathname,
          query,
        }: { hostname: string; pathname: string; query: string },
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
            gatewayUrl = `${ipfsGateway}${hash}${pathname || '/'}${
              query || ''
            }`;
            const response = await fetch(gatewayUrl, {
              headers: {
                'User-Agent': 'MetaMask Mobile Browser',
              },
            });
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
      const hostname = new URLParse(urlToTrigger).origin;
      const connectedAccounts = getPermittedCaipAccountIdsByHostname(
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
        dismissTextSelectionIfNeeded();
        newTab(newTabUrl);
      },
      [dismissTextSelectionIfNeeded, newTab],
    );

    /**
     * Show the tabs view
     */
    const showTabsView = useCallback(() => {
      dismissTextSelectionIfNeeded();
      showTabs();
    }, [dismissTextSelectionIfNeeded, showTabs]);

    /**
     * Handle when the drawer (app menu) is opened
     */
    const drawerOpenHandler = useCallback(() => {
      dismissTextSelectionIfNeeded();
    }, [dismissTextSelectionIfNeeded]);

    const handleFirstUrl = useCallback(async () => {
      setIsResolvedIpfsUrl(false);
      setFirstUrlLoaded(true);
      setProgress(0);
      return;
    }, []);

    /**
     * Set initial url, dapp scripts and engine. Similar to componentDidMount
     */
    useEffect(() => {
      if (!isTabActive || isWebViewReadyToLoad.current) return;

      isWebViewReadyToLoad.current = true;

      const getEntryScriptWeb3 = async () => {
        const entryScriptWeb3Fetched = await EntryScriptWeb3.get();
        setEntryScriptWeb3(
          entryScriptWeb3Fetched +
            SPA_urlChangeListener +
            SCROLL_TRACKER_SCRIPT,
        );
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
        BackHandler.addEventListener(
          'hardwareBackPress',
          handleAndroidBackPress,
        );
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
        navigation,
      ],
    );

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

        const hostName = new URLParse(siteInfo.url).origin;
        // Prevent url from being set when the url bar is focused
        !isUrlBarFocused &&
          urlBarRef.current?.setNativeProps({ text: hostName });

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

        updateTabInfo(tabId, {
          url: getMaskedUrl(siteInfo.url, sessionENSNamesRef.current),
        });

        addToBrowserHistory({
          name: siteInfo.title,
          url: getMaskedUrl(siteInfo.url, sessionENSNamesRef.current),
        });
      },
      [
        isUrlBarFocused,
        setConnectionType,
        isTabActive,
        tabId,
        updateTabInfo,
        addToBrowserHistory,
        navigation,
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
      webStates.current[urlToLoad] = {
        ...webStates.current[urlToLoad],
        requested: true,
      };

      if (!isIpfsGatewayEnabled && isResolvedIpfsUrl) {
        setIpfsBannerVisible(true);
        return false;
      }

      // TODO: Make sure to replace with cache hits once EPD has been deprecated.
      if (!isProductSafetyDappScanningEnabled()) {
        const scanResult = getPhishingTestResult(urlToLoad);
        let whitelistUrlInput = prefixUrlWithProtocol(urlToLoad);
        whitelistUrlInput = whitelistUrlInput.replace(/\/$/, ''); // removes trailing slash
        if (scanResult.result && !whitelist.includes(whitelistUrlInput)) {
          handleNotAllowedUrl(urlToLoad);
          return false;
        }
      }

      // Check if this is an internal MetaMask deeplink that should be handled within the app
      if (isInternalDeepLink(urlToLoad)) {
        // Handle the deeplink internally instead of passing to OS
        SharedDeeplinkManager.getInstance()
          .parse(urlToLoad, {
            origin: AppConstants.DEEPLINKS.ORIGIN_IN_APP_BROWSER,
            browserCallBack: (url: string) => {
              // If the deeplink handler wants to navigate to a different URL in the browser
              if (url && webviewRef.current) {
                webviewRef.current.injectJavaScript(`
                window.location.href = '${sanitizeUrlInput(url)}';
                true;  // Required for iOS
              `);
              }
            },
          })
          .catch((deeplinkError) => {
            Logger.error(
              deeplinkError,
              'BrowserTab: Failed to handle internal deeplink in browser',
            );
          });
        return false; // Stop the webview from loading this URL
      }

      const { protocol } = new URLParse(urlToLoad);

      if (trustedProtocolToDeeplink.includes(protocol)) {
        allowLinkOpen(urlToLoad);

        // Webview should not load deeplink protocols
        // We redirect them to the OS linking system instead
        return false;
      }

      if (protocolAllowList.includes(protocol)) {
        // Continue with the URL loading on the Webview
        return true;
      }

      // Use Sentry Breadcumbs to log the untrusted protocol
      Logger.log(`Protocol not allowed ${protocol}`);

      // Pop up an alert dialog box to prompt the user for permission
      // to execute the request
      const alertMsg = getAlertMessage(protocol, strings);
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
        loadingUrlRef.current = '';
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
     * Check if any iFrame URLs are prohibited
     */
    const checkIFrameUrls = useCallback(
      async (iframeUrls: string[]) => {
        for (const iframeUrl of iframeUrls) {
          const { origin: iframeOrigin } = new URLParse(iframeUrl);
          const isAllowed = await isAllowedOrigin(iframeOrigin);
          if (!isAllowed) {
            handleNotAllowedUrl(iframeOrigin);
            return;
          }
        }
      },
      [isAllowedOrigin, handleNotAllowedUrl],
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
        if (dataParsed.type === 'SCROLL_POSITION') {
          const scrollPosition = dataParsed.payload?.scrollY || 0;
          scrollY.value = scrollPosition;
          // Use threshold instead of exact 0 - Android WebView may report small non-zero values
          // when at top due to content padding, headers, or floating-point precision
          setIsAtTop(scrollPosition <= SCROLL_TOP_THRESHOLD);
          return;
        }
        if (
          dataParsed.type === 'IFRAME_DETECTED' &&
          Array.isArray(dataParsed.iframeUrls) &&
          dataParsed.iframeUrls.length > 0
        ) {
          const validIframeUrls = dataParsed.iframeUrls.filter(
            (url: unknown): url is string =>
              typeof url === 'string' && url.trim().length > 0,
          );
          if (validIframeUrls.length > 0) {
            checkIFrameUrls(validIframeUrls);
          }
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
            getProviderState,
          }: {
            getProviderState: () => void;
          }) =>
            getRpcMethodMiddleware({
              hostname: new URL(urlBridge).origin,
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

    const sendActiveAccount = useCallback(
      async (targetUrl?: string) => {
        // Use targetUrl if explicitly provided (even if empty), otherwise fall back to resolvedUrlRef.current
        const urlToCheck =
          targetUrl !== undefined ? targetUrl : resolvedUrlRef.current;

        if (!urlToCheck) {
          // If no URL to check, send empty accounts
          notifyAllConnections({
            method: NOTIFICATION_NAMES.accountsChanged,
            params: [],
          });
          return;
        }

        // Get permitted accounts for the target URL
        const permissionsControllerState =
          Engine.context.PermissionController.state;
        let origin = ''; // notifyAllConnections will return empty array if ''
        try {
          origin = new URLParse(urlToCheck).origin;
        } catch (err) {
          Logger.log('Error parsing WebView URL', err);
        }
        const permittedAcc = getPermittedEvmAddressesByHostname(
          permissionsControllerState,
          origin,
        );

        notifyAllConnections({
          method: NOTIFICATION_NAMES.accountsChanged,
          params: permittedAcc,
        });
      },
      [notifyAllConnections],
    );

    /**
     * Website started to load
     */
    const onLoadStart = useCallback(
      async ({ nativeEvent }: WebViewNavigationEvent) => {
        loadingUrlRef.current = nativeEvent.url;

        // Use URL to produce real url. This should be the actual website that the user is viewing.
        const { origin: urlOrigin } = new URLParse(nativeEvent.url);

        webStates.current[nativeEvent.url] = {
          ...webStates.current[nativeEvent.url],
          started: true,
        };
        if (nativeEvent.url.startsWith('http://')) {
          /*
            If the user is initially redirected to the page using the HTTP protocol,
            which then automatically redirects to HTTPS, we receive `onLoadStart` for the HTTP URL
            and `onLoadEnd` for the HTTPS URL. In this case, the URL bar will not be updated.
            To fix this, we also mark the HTTPS version of the URL as started.
          */
          const urlWithHttps = nativeEvent.url.replace(
            regex.urlHttpToHttps,
            'https://',
          );
          webStates.current[urlWithHttps] = {
            ...webStates.current[urlWithHttps],
            started: true,
          };
        }

        // Cancel loading the page if we detect its a phishing page
        const isAllowed = await isAllowedOrigin(urlOrigin);
        if (!isAllowed) {
          handleNotAllowedUrl(urlOrigin);
          return false;
        }

        sendActiveAccount(nativeEvent.url);

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
    }, [sendActiveAccount, permittedEvmAccountsList]);

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
     * Animated style for refresh indicator
     */
    const refreshIndicatorStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: pullProgress.value * PULL_THRESHOLD - PULL_THRESHOLD },
      ],
      opacity: pullProgress.value,
    }));

    /**
     * Render refresh indicator
     */
    const renderRefreshIndicator = useCallback(
      () =>
        isAtTop && (
          <Animated.View
            style={[
              styles.refreshIndicator,
              // eslint-disable-next-line react-native/no-inline-styles
              { height: PULL_THRESHOLD },
              refreshIndicatorStyle,
            ]}
          >
            <ActivityIndicator
              size="small"
              color={theme.colors.primary.default}
            />
          </Animated.View>
        ),
      [isAtTop, refreshIndicatorStyle, theme.colors.primary.default, styles],
    );

    const isExternalLink = useMemo(
      () => linkType === EXTERNAL_LINK_TYPE,
      [linkType],
    );

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
            trackErrorAsAnalytics(
              'Browser: Failed to handle ENS url',
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
     * Reload current page
     */
    const reload = useCallback(() => {
      onSubmitEditing(resolvedUrlRef.current);
      triggerDappViewedEvent(resolvedUrlRef.current);
    }, [onSubmitEditing, triggerDappViewedEvent]);

    const handleOnFileDownload = useCallback(
      async ({
        nativeEvent: { downloadUrl },
      }: {
        nativeEvent: { downloadUrl: string };
      }) => {
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
     * Trigger refresh when state changes
     * Uses state-driven pattern to avoid Reanimated runOnJS crashes
     */
    useEffect(() => {
      if (shouldRefresh) {
        setIsRefreshing(true);
        setShouldRefresh(false);
        reload();
        impactAsync(ImpactFeedbackStyle.Medium);

        // Track analytics
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BROWSER_PULL_REFRESH)
            .addProperties({ pull_distance: pullDistanceRef.current })
            .build(),
        );

        setTimeout(() => setIsRefreshing(false), 1000);
      }
    }, [shouldRefresh, reload, trackEvent, createEventBuilder]);

    /**
     * Render the bottom navigation bar
     */
    const renderBottomBar = () =>
      isTabActive && !isUrlBarFocused ? (
        <BrowserBottomBar
          canGoBack={backEnabled}
          canGoForward={forwardEnabled}
          goBack={goBack}
          goForward={goForward}
          reload={reload}
          openNewTab={openNewTab}
          activeUrl={resolvedUrlRef.current}
          getMaskedUrl={getMaskedUrl}
          title={titleRef.current}
          sessionENSNames={sessionENSNamesRef.current}
          favicon={favicon}
          icon={iconRef.current}
        />
      ) : null;

    /**
     * Handle autocomplete selection
     */
    const onSelect = useCallback(
      (item: AutocompleteSearchResult) => {
        // Unfocus the url bar and hide the autocomplete results
        urlBarRef.current?.hide();
        if (item.category === 'tokens') {
          navigation.navigate(Routes.BROWSER.ASSET_LOADER, {
            chainId: item.chainId,
            address: item.address,
          });
        } else {
          onSubmitEditing(item.url);
        }
      },
      [onSubmitEditing, navigation],
    );

    /**
     * Handle autocomplete dismissal
     */
    const onDismissAutocomplete = useCallback(() => {
      // Unfocus the url bar and hide the autocomplete results
      urlBarRef.current?.hide();
      const hostName =
        new URLParse(resolvedUrlRef.current).origin || resolvedUrlRef.current;
      urlBarRef.current?.setNativeProps({ text: hostName });
    }, []);

    /**
     * Hide the autocomplete results
     */
    const hideAutocomplete = useCallback(
      () => autocompleteRef.current?.hide(),
      [],
    );

    const handleClosePress = useCallback(() => {
      if (fromPerps) {
        // If opened from Perps, navigate back to PerpsHome
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.PERPS_HOME,
        });
      } else if (fromTrending) {
        // If within trending follow the normal back button behavior
        navigation.goBack();
      } else if (isAssetsTrendingTokensEnabled) {
        // If trending is enabled, go to trending view
        navigation.navigate(Routes.TRENDING_VIEW, {
          screen: Routes.TRENDING_FEED,
        });
      } else {
        // If trending is disabled, go back to wallet home
        navigation.navigate(Routes.WALLET.HOME);
      }
    }, [navigation, fromTrending, fromPerps, isAssetsTrendingTokensEnabled]);

    const onCancelUrlBar = useCallback(() => {
      hideAutocomplete();
      // Reset the url bar to the current url
      const hostName =
        new URLParse(resolvedUrlRef.current).origin || resolvedUrlRef.current;
      urlBarRef.current?.setNativeProps({ text: hostName });
    }, [hideAutocomplete]);

    const onFocusUrlBar = useCallback(() => {
      // Show the autocomplete results
      autocompleteRef.current?.show();
      urlBarRef.current?.setNativeProps({ text: resolvedUrlRef.current });
    }, []);

    const onChangeUrlBar = useCallback((text: string) => {
      // Search the autocomplete results
      autocompleteRef.current?.search(text);
    }, []);

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

    const { OnLoadEnd, OnLoadProgress, OnLoadStart } =
      WebViewNavigationEventName;

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

    /*
     * Wildcard '*' matches all URL that go through WebView,
     * so that all content gets filtered by onShouldStartLoadWithRequest function.
     *
     * All URL that do not match will bypass onShouldStartLoadWithRequest
     * and go directly to the OS handler
     *
     * source: https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#originwhitelist
     *
     */
    const webViewOriginWhitelist = ['*'];

    /**
     * Main render
     */
    return (
      <ErrorBoundary navigation={navigation} view="BrowserTab">
        <View style={[styles.wrapper, !isTabActive && styles.hide]}>
          <View
            style={styles.wrapper}
            {...(Device.isAndroid() ? { collapsable: false } : {})}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <ButtonIcon
                iconName={IconName.Close}
                size={ButtonIconSize.Lg}
                onPress={handleClosePress}
                testID="browser-tab-close-button"
              />
              <Box twClassName="flex-1">
                <BrowserUrlBar
                  ref={urlBarRef}
                  connectionType={connectionType}
                  onSubmitEditing={onSubmitEditing}
                  onCancel={onCancelUrlBar}
                  onFocus={onFocusUrlBar}
                  onBlur={hideAutocomplete}
                  onChangeText={onChangeUrlBar}
                  connectedAccounts={permittedCaipAccountAddressesList}
                  activeUrl={resolvedUrlRef.current}
                  setIsUrlBarFocused={setIsUrlBarFocused}
                  isUrlBarFocused={isUrlBarFocused}
                  showCloseButton={
                    fromTrending && isAssetsTrendingTokensEnabled
                  }
                  showTabs={showTabsView}
                />
              </Box>
            </Box>
            <View style={styles.wrapper}>
              {renderProgressBar()}
              <View style={styles.webview}>
                {renderRefreshIndicator()}

                {/*
                  FULLY UNIFIED GESTURE APPROACH (USE_UNIFIED_GESTURE = true)

                  Uses manualActivation(true) to control gesture activation based on
                  touch position. All three gestures (back, forward, refresh) are
                  handled by a single gesture handler - NO OVERLAYS NEEDED!

                  OVERLAY GESTURE APPROACH (USE_UNIFIED_GESTURE = false - fallback)

                  All gestures use transparent overlays positioned above WebView:
                  1. Edge overlays (z-index: 9999) - 20px wide, left/right
                  2. Pull overlay (z-index: 9998) - 100px tall, top only when scrollY === 0
                  3. Refresh indicator (z-index: 9997) - Animated spinner
                */}

                {/* FULLY UNIFIED APPROACH: Single gesture handles all interactions */}
                {USE_UNIFIED_GESTURE && !!entryScriptWeb3 && firstUrlLoaded && (
                  <GestureDetector gesture={combinedWebViewGesture}>
                    <View style={styles.webview}>
                      <WebView
                        originWhitelist={webViewOriginWhitelist}
                        decelerationRate={0.998}
                        ref={webviewRef}
                        renderError={() => (
                          <WebviewErrorComponent
                            error={error}
                            returnHome={returnHome}
                          />
                        )}
                        source={{
                          uri: prefixUrlWithProtocol(initialUrl),
                          ...(isExternalLink
                            ? { headers: { Cookie: '' } }
                            : null),
                        }}
                        injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
                        style={styles.webview}
                        onLoadStart={handleWebviewNavigationChange(OnLoadStart)}
                        onLoadEnd={handleWebviewNavigationChange(OnLoadEnd)}
                        onLoadProgress={handleWebviewNavigationChange(
                          OnLoadProgress,
                        )}
                        onNavigationStateChange={handleOnNavigationStateChange}
                        onMessage={onMessage}
                        onShouldStartLoadWithRequest={
                          onShouldStartLoadWithRequest
                        }
                        allowsInlineMediaPlayback
                        {...(process.env.IS_TEST === 'true'
                          ? { javaScriptEnabled: true }
                          : {})}
                        testID={BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID}
                        applicationNameForUserAgent={'WebView MetaMaskMobile'}
                        onFileDownload={handleOnFileDownload}
                        webviewDebuggingEnabled={isTest}
                        paymentRequestEnabled
                      />
                      {ipfsBannerVisible && (
                        <IpfsBanner
                          setIpfsBannerVisible={setIpfsBannerVisible}
                        />
                      )}
                    </View>
                  </GestureDetector>
                )}

                {/* OVERLAY APPROACH (fallback): Separate gesture overlays */}
                {!USE_UNIFIED_GESTURE && (
                  <>
                    {/* Top overlay for pull-to-refresh - only when scrolled to top */}
                    {isAtTop && !isRefreshing && areGesturesEnabled && (
                      <GestureDetector gesture={pullToRefreshGesture}>
                        <View
                          style={[
                            styles.pullOverlay,
                            { height: PULL_OVERLAY_HEIGHT },
                          ]}
                        />
                      </GestureDetector>
                    )}
                    {!!entryScriptWeb3 && firstUrlLoaded && (
                      <>
                        <WebView
                          originWhitelist={webViewOriginWhitelist}
                          decelerationRate={0.998}
                          ref={webviewRef}
                          renderError={() => (
                            <WebviewErrorComponent
                              error={error}
                              returnHome={returnHome}
                            />
                          )}
                          source={{
                            uri: prefixUrlWithProtocol(initialUrl),
                            ...(isExternalLink
                              ? { headers: { Cookie: '' } }
                              : null),
                          }}
                          injectedJavaScriptBeforeContentLoaded={
                            entryScriptWeb3
                          }
                          style={styles.webview}
                          onLoadStart={handleWebviewNavigationChange(
                            OnLoadStart,
                          )}
                          onLoadEnd={handleWebviewNavigationChange(OnLoadEnd)}
                          onLoadProgress={handleWebviewNavigationChange(
                            OnLoadProgress,
                          )}
                          onNavigationStateChange={
                            handleOnNavigationStateChange
                          }
                          onMessage={onMessage}
                          onShouldStartLoadWithRequest={
                            onShouldStartLoadWithRequest
                          }
                          allowsInlineMediaPlayback
                          {...(process.env.IS_TEST === 'true'
                            ? { javaScriptEnabled: true }
                            : {})}
                          testID={BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID}
                          applicationNameForUserAgent={'WebView MetaMaskMobile'}
                          onFileDownload={handleOnFileDownload}
                          webviewDebuggingEnabled={isTest}
                          paymentRequestEnabled
                        />
                        {ipfsBannerVisible && (
                          <IpfsBanner
                            setIpfsBannerVisible={setIpfsBannerVisible}
                          />
                        )}
                      </>
                    )}

                    {/* Edge gesture overlay zones - horizontal swipe navigation */}
                    {areGesturesEnabled && (
                      <>
                        {/* Left edge for back gesture */}
                        {backEnabled && (
                          <GestureDetector gesture={leftEdgeGesture}>
                            <View
                              style={[
                                styles.gestureOverlayLeft,
                                { width: EDGE_THRESHOLD },
                              ]}
                            />
                          </GestureDetector>
                        )}
                        {/* Right edge for forward gesture */}
                        {forwardEnabled && (
                          <GestureDetector gesture={rightEdgeGesture}>
                            <View
                              style={[
                                styles.gestureOverlayRight,
                                { width: EDGE_THRESHOLD },
                              ]}
                            />
                          </GestureDetector>
                        )}
                      </>
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
                goToUrl={onSubmitEditing}
              />
            )}

            {renderBottomBar()}
          </View>
        </View>
      </ErrorBoundary>
    );
  },
);

const mapStateToProps = (state: RootState) => ({
  bookmarks: state.bookmarks,
  ipfsGateway: selectIpfsGateway(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  isIpfsGatewayEnabled: selectIsIpfsGatewayEnabled(state),
  activeChainId: selectEvmChainId(state),
  isFullscreen: selectBrowserFullscreen(state),
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  addToBrowserHistory: ({ url, name }: { name: string; url: string }) =>
    dispatch(addToHistory({ url, name })),
  addToWhitelist: (url: string) => dispatch(addToWhitelist(url)),
  toggleFullscreen: (isFullscreen: boolean) => {
    dispatch(toggleFullscreen(isFullscreen));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(BrowserTab);
