import {
  BottomSheetDialog,
  Box,
  type BottomSheetDialogRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { selectIsSubmittingTx } from '../../../../../../core/redux/slices/bridge';
import { useABTest } from '../../../../../../hooks/useABTest';
import { useElevatedSurface } from '../../../../../../util/theme/themeUtils';
import {
  SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_EXPOSURE_METADATA,
  SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS,
} from './abTestConfig';
import {
  buildQuickBuySharedAnalyticsProperties,
  QuickBuyEventProperties,
  QuickBuyEventValues,
} from './analytics';
import { useSocialLeaderboardAnalytics } from '../../../analytics';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';
import { QuickBuyProvider } from './QuickBuyContext';
import QuickBuyPriceImpactConfirmScreen from './QuickBuyPriceImpactConfirmScreen';
import QuickBuyQuoteDetailsScreen from './QuickBuyQuoteDetailsScreen';
import QuickBuySelectQuoteScreen from './QuickBuySelectQuoteScreen';
import QuickBuyTokenSelectScreen from './QuickBuyTokenSelectScreen';
import {
  makeScreenTransitions,
  SCREEN_DEPTH,
  type ScreenDirection,
} from './transitions';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyRootProps,
  QuickBuyScreen,
  QuickBuyTarget,
} from './types';

export type { QuickBuyRootProps } from './types';

function renderActiveScreen(
  activeScreen: QuickBuyScreen,
  children: React.ReactNode | undefined,
): React.ReactNode {
  if (children !== undefined && children !== null) {
    return children;
  }

  switch (activeScreen) {
    case 'payWith':
      return <QuickBuyTokenSelectScreen />;
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
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { track } = useSocialLeaderboardAnalytics();
  const bottomSheetRef = useRef<BottomSheetDialogRef>(null);
  const [isContentReady, setIsContentReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<QuickBuyScreen>('amount');
  // Measured once from the first screen and reused as a fixed height for every
  // screen so the sheet keeps a constant size during navigation (no layout
  // shift between screens).
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  // True once a dismissal is requested via the CTA/Cancel so the content drops
  // with the sheet instead of running its horizontal screen-exit transition.
  const [isClosing, setIsClosing] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const surfaceClass = useElevatedSurface();

  // Keyboard vs slider A/B test. Resolved here so `Experiment Viewed` fires
  // once the sheet is actually shown (this component only mounts when visible).
  const { variant } = useABTest(
    SOCIAL_AI_QUICK_BUY_KEYBOARD_AB_KEY,
    SOCIAL_AI_QUICK_BUY_KEYBOARD_VARIANTS,
    SOCIAL_AI_QUICK_BUY_KEYBOARD_EXPOSURE_METADATA,
  );
  const useKeyboard = variant.useKeyboard;

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
    bottomSheetRef.current?.onOpenDialog(() => {
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
    if (sheet?.onCloseDialog) {
      sheet.onCloseDialog(onClose);
    } else {
      onClose();
    }
  }, [onClose]);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // The keyboard treatment sizes each screen to its own content so the
      // amount screen can grow/shrink with the keypad; skip height locking.
      if (useKeyboard || lockedHeight !== null) {
        return;
      }
      const { height } = event.nativeEvent.layout;
      if (height > 0) {
        setLockedHeight(height);
      }
    },
    [useKeyboard, lockedHeight],
  );

  // Keep the bottom safe-area inset only on screens that pin a CTA at the
  // bottom; the scroll-only screens (quote details / select quote / pay with /
  // receive) sit flush to the edge instead of leaving dead space below.
  const hasBottomCta =
    activeScreen === 'amount' || activeScreen === 'priceImpactConfirm';

  return (
    <BottomSheetDialog
      ref={bottomSheetRef}
      onClose={onClose}
      twClassName={surfaceClass}
    >
      {isContentReady ? (
        <QuickBuyProvider
          target={target}
          onClose={requestClose}
          features={features}
          analyticsContext={analyticsContext}
          activeScreen={activeScreen}
          setActiveScreen={navigateToScreen}
          useKeyboard={useKeyboard}
        >
          <Box
            testID="quick-buy-content-container"
            onLayout={handleContentLayout}
            style={
              lockedHeight !== null
                ? {
                    // Scroll-only screens reclaim the bottom safe-area inset
                    // that BottomSheetDialog adds, so they sit flush to the
                    // edge while keeping the same overall sheet height as the
                    // CTA screens (no layout shift between screens).
                    height: hasBottomCta
                      ? lockedHeight
                      : lockedHeight + bottomInset,
                    ...(hasBottomCta ? {} : { marginBottom: -bottomInset }),
                  }
                : undefined
            }
          >
            <Animated.View
              key={activeScreen}
              entering={hasNavigated ? entering : undefined}
              exiting={isClosing ? undefined : exiting}
              style={lockedHeight !== null ? tw.style('flex-1') : undefined}
            >
              {renderActiveScreen(activeScreen, children)}
            </Animated.View>
          </Box>
        </QuickBuyProvider>
      ) : (
        <QuickBuyBottomSheetSkeleton useKeyboard={useKeyboard} />
      )}
    </BottomSheetDialog>
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
