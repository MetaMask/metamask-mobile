import {
  BottomSheet,
  Box,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  buildQuickBuySharedAnalyticsProperties,
  QuickBuyEventProperties,
  QuickBuyEventValues,
} from './analytics';
import { useSocialLeaderboardAnalytics } from '../../Views/SocialLeaderboard/analytics';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import { QuickBuyProvider } from './QuickBuyContext';
import QuickBuyEditQuickAmountsScreen from './QuickBuyEditQuickAmountsScreen';
import QuickBuyPriceImpactConfirmScreen from './QuickBuyPriceImpactConfirmScreen';
import QuickBuyQuoteDetailsScreen from './QuickBuyQuoteDetailsScreen';
import QuickBuySelectQuoteScreen from './QuickBuySelectQuoteScreen';
import QuickBuyTokenSelectScreen from './QuickBuyTokenSelectScreen';
import QuickBuyNetworkListScreen from './QuickBuyNetworkListScreen';
import {
  makeScreenTransitions,
  SCREEN_DEPTH,
  type ScreenDirection,
} from './transitions';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyRootProps,
  QuickBuyScreen,
  QuickBuyTarget,
} from './types';
import { SwapsFeatureIdProvider } from '../Bridge/providers/SwapsFeatureIdProvider';
import { getQuickBuyFeatureId } from './utils/getQuickBuyFeatureId';
import { setTokenSelectorNetworkFilter } from '../../../core/redux/slices/bridge';

export type { QuickBuyRootProps } from './types';

function renderActiveScreen(
  activeScreen: QuickBuyScreen,
  children: React.ReactNode | undefined,
): React.ReactNode {
  if (children !== undefined && children !== null) {
    return children;
  }

  switch (activeScreen) {
    case 'editQuickAmounts':
      return <QuickBuyEditQuickAmountsScreen />;
    case 'payWith':
      return <QuickBuyTokenSelectScreen />;
    case 'selectNetwork':
      return <QuickBuyNetworkListScreen />;
    case 'quoteDetails':
      return <QuickBuyQuoteDetailsScreen />;
    case 'selectQuote':
      return <QuickBuySelectQuoteScreen />;
    case 'priceImpactConfirm':
      return <QuickBuyPriceImpactConfirmScreen />;
    case 'amount':
    default:
      return <QuickBuyAmountScreen />;
  }
}

interface QuickBuyRootInnerProps {
  target: QuickBuyTarget;
  onClose: () => void;
  features: QuickBuyFeatures;
  analyticsContext?: QuickBuyAnalyticsContext;
  children?: React.ReactNode;
}

const QuickBuyRootInner: React.FC<QuickBuyRootInnerProps> = ({
  target,
  onClose,
  features,
  analyticsContext,
  children,
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { track } = useSocialLeaderboardAnalytics();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<QuickBuyScreen>('amount');
  // True once a dismissal is requested via the CTA/Cancel so the content drops
  // with the sheet instead of running its horizontal screen-exit transition.
  const [isClosing, setIsClosing] = useState(false);

  const directionSV = useSharedValue<ScreenDirection>(1);
  // Suppresses the enter animation on the initial screen when the sheet opens;
  // transitions only kick in once the user navigates between screens.
  const [hasNavigated, setHasNavigated] = useState(false);
  const { entering, exiting } = useMemo(
    () => makeScreenTransitions(directionSV),
    [directionSV],
  );

  const navigateToScreen = useCallback(
    (next: QuickBuyScreen) => {
      setHasNavigated(true);
      setActiveScreen((current) => {
        directionSV.value =
          SCREEN_DEPTH[next] >= SCREEN_DEPTH[current] ? 1 : -1;
        return next;
      });
    },
    [directionSV],
  );

  const trackSheetViewed = useCallback(() => {
    const source = analyticsContext?.source;
    if (!source || !target.tokenSymbol) {
      return;
    }
    track(MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED, {
      [QuickBuyEventProperties.ASSET_NAME]: target.tokenSymbol,
      ...buildQuickBuySharedAnalyticsProperties(analyticsContext),
      [QuickBuyEventProperties.TRADE_TYPE]:
        analyticsContext.traderTradeType ?? QuickBuyEventValues.TRADE_TYPE.BUY,
    });
  }, [analyticsContext, target.tokenSymbol, track]);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet(() => {
      setIsContentReady(true);
      trackSheetViewed();
    });
  }, [trackSheetViewed]);

  // Animate the sheet down (then run the parent's onClose) and flag the content
  // as closing so it doesn't slide horizontally on the way out. Falls back to a
  // direct onClose when the imperative handle isn't available.
  const requestClose = useCallback(() => {
    setIsClosing(true);
    const sheet = bottomSheetRef.current;
    if (sheet?.onCloseBottomSheet) {
      sheet.onCloseBottomSheet(onClose);
    } else {
      onClose();
    }
  }, [onClose]);

  // The picker leaves the shared token-selector network filter to Quick Buy;
  // clear it however the sheet is dismissed so it can't leak into Bridge.
  useEffect(
    () => () => {
      dispatch(setTokenSelectorNetworkFilter(undefined));
    },
    [dispatch],
  );

  // Keep the bottom safe-area inset only on screens that pin a CTA at the
  // bottom; the scroll-only screens (quote details / select quote / pay with /
  // receive) sit flush to the edge instead of leaving dead space below.
  const hasBottomCta =
    activeScreen === 'amount' ||
    activeScreen === 'editQuickAmounts' ||
    activeScreen === 'priceImpactConfirm';

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose} isFullscreen>
      {isContentReady ? (
        <QuickBuyProvider
          target={target}
          onClose={requestClose}
          features={features}
          analyticsContext={analyticsContext}
          activeScreen={activeScreen}
          setActiveScreen={navigateToScreen}
        >
          <Box
            testID={QuickBuySheetSelectorsIDs.CONTENT_CONTAINER}
            twClassName="flex-1"
            style={hasBottomCta ? undefined : { marginBottom: -bottomInset }}
          >
            <Animated.View
              key={activeScreen}
              entering={hasNavigated ? entering : undefined}
              exiting={isClosing ? undefined : exiting}
              style={tw.style('flex-1')}
            >
              <SwapsFeatureIdProvider
                featureId={getQuickBuyFeatureId(analyticsContext?.source)}
              >
                {renderActiveScreen(activeScreen, children)}
              </SwapsFeatureIdProvider>
            </Animated.View>
          </Box>
        </QuickBuyProvider>
      ) : (
        <QuickBuyBottomSheetSkeleton />
      )}
    </BottomSheet>
  );
};

/**
 * Compound Quick Buy root — bottom sheet, provider, and screen routing.
 */
const QuickBuyRoot: React.FC<QuickBuyRootProps> = ({
  isVisible,
  target,
  onClose,
  features = TOP_TRADERS_QUICK_BUY_FEATURES,
  analyticsContext,
  children,
}) => {
  if (!isVisible || !target) {
    return null;
  }

  return (
    <QuickBuyRootInner
      target={target}
      onClose={onClose}
      features={features}
      analyticsContext={analyticsContext}
    >
      {children}
    </QuickBuyRootInner>
  );
};

export default QuickBuyRoot;
